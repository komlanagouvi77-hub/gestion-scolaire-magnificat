import csv
import io

from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import FileResponse, Http404
from rest_framework import viewsets
from rest_framework.decorators import action, api_view, parser_classes, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import serializers
from drf_spectacular.utils import extend_schema, inline_serializer, OpenApiTypes

from django.shortcuts import get_object_or_404

from comptes.models import Enseignant
from config.validators import valider_taille_csv
from .models import Absence, Bulletin, Classe, Cours, Eleve, Matiere, Note, Observation
from .permissions import EstAdministrateurOuLectureSeule
from .services import generer_bulletin, generer_bulletins_lot
from .serializers import (
    AbsenceSerializer,
    BulletinSerializer,
    ClasseSerializer,
    CoursSerializer,
    EleveSerializer,
    MatiereSerializer,
    NoteSerializer,
    ObservationSerializer,
)


class GenerationBulletinsLotRequestSerializer(serializers.Serializer):
    eleves = serializers.ListField(
        child=serializers.IntegerField(min_value=1), min_length=1, max_length=500
    )
    trimestre = serializers.IntegerField(min_value=1, max_value=3)


class ClasseViewSet(viewsets.ModelViewSet):
    """
    Liste/detail des classes.
    Lecture : tout utilisateur connecte. Ecriture : Administrateur uniquement.
    """

    queryset = Classe.objects.all()
    serializer_class = ClasseSerializer
    permission_classes = [EstAdministrateurOuLectureSeule]


class MatiereViewSet(viewsets.ModelViewSet):
    queryset = Matiere.objects.all()
    serializer_class = MatiereSerializer
    permission_classes = [EstAdministrateurOuLectureSeule]


class EleveViewSet(viewsets.ModelViewSet):
    """
    Un Administrateur voit tous les eleves.
    Un Enseignant voit uniquement les eleves de ses classes.
    Un Parent voit uniquement ses propres enfants.
    """

    serializer_class = EleveSerializer
    permission_classes = [EstAdministrateurOuLectureSeule]

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return Eleve.objects.all()
        if hasattr(utilisateur, "enseignant"):
            return Eleve.objects.filter(classe__in=utilisateur.enseignant.classes.all())
        if hasattr(utilisateur, "parent"):
            return utilisateur.parent.eleves.all()
        return Eleve.objects.none()


class NoteViewSet(viewsets.ModelViewSet):
    """
    Un Enseignant ne peut creer/modifier que des notes pour ses propres
    classes et matieres, et seulement si le trimestre n'est pas verrouille
    par l'administration. Un Parent voit uniquement les notes de ses
    enfants (lecture seule). Un Administrateur voit et gere tout.
    """

    serializer_class = NoteSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return Note.objects.all()
        if hasattr(utilisateur, "enseignant"):
            # Un enseignant ne doit voir que les notes de SES classes, dans
            # UNE de ses matieres. Filtrer uniquement par matiere ne suffit
            # pas : si un collegue enseigne la meme matiere dans une autre
            # classe, un simple filtre "matiere" exposerait ses notes aussi.
            return Note.objects.filter(
                matiere__in=utilisateur.enseignant.matieres.all(),
                eleve__classe__in=utilisateur.enseignant.classes.all(),
            )
        if hasattr(utilisateur, "parent"):
            return Note.objects.filter(eleve__in=utilisateur.parent.eleves.all())
        return Note.objects.none()

    def _verifier_periode_ouverte(self, trimestre, utilisateur):
        from comptes.models import Parametres

        if hasattr(utilisateur, "administrateur"):
            return  # l'Administrateur peut toujours forcer une correction
        if Parametres.charger().trimestre_verrouille(trimestre):
            raise PermissionDenied("Ce trimestre est verrouille par l'administration : les notes ne peuvent plus etre modifiees.")

    def _verifier_perimetre_enseignant(self, utilisateur, eleve, matiere):
        """
        Empeche un enseignant de saisir une note pour un eleve qui n'est pas
        dans une de ses classes, ou pour une matiere qui ne lui est pas
        attribuee. Sans ce controle, n'importe quel enseignant authentifie
        pouvait injecter/modifier une note pour n'importe quel eleve.
        """
        if hasattr(utilisateur, "administrateur"):
            return
        if matiere not in utilisateur.enseignant.matieres.all():
            raise PermissionDenied("Cette matiere ne vous est pas attribuee.")
        if eleve.classe not in utilisateur.enseignant.classes.all():
            raise PermissionDenied("Cet eleve n'est pas dans une de vos classes.")

    def perform_create(self, serializer):
        utilisateur = self.request.user
        if not hasattr(utilisateur, "enseignant") and not hasattr(utilisateur, "administrateur"):
            raise PermissionDenied("Seul un enseignant ou un administrateur peut saisir une note.")
        eleve = serializer.validated_data.get("eleve")
        matiere = serializer.validated_data.get("matiere")
        self._verifier_perimetre_enseignant(utilisateur, eleve, matiere)
        self._verifier_periode_ouverte(serializer.validated_data.get("trimestre"), utilisateur)
        serializer.save(enseignant=utilisateur)

    def perform_update(self, serializer):
        utilisateur = self.request.user
        if not hasattr(utilisateur, "enseignant") and not hasattr(utilisateur, "administrateur"):
            raise PermissionDenied("Seul un enseignant ou un administrateur peut modifier une note.")
        eleve = serializer.validated_data.get("eleve", serializer.instance.eleve)
        matiere = serializer.validated_data.get("matiere", serializer.instance.matiere)
        self._verifier_perimetre_enseignant(utilisateur, eleve, matiere)
        trimestre = serializer.validated_data.get("trimestre", serializer.instance.trimestre)
        self._verifier_periode_ouverte(trimestre, utilisateur)
        serializer.save()

    def perform_destroy(self, instance):
        utilisateur = self.request.user
        if not hasattr(utilisateur, "enseignant") and not hasattr(utilisateur, "administrateur"):
            raise PermissionDenied("Seul un enseignant ou un administrateur peut supprimer une note.")
        self._verifier_perimetre_enseignant(utilisateur, instance.eleve, instance.matiere)
        self._verifier_periode_ouverte(instance.trimestre, utilisateur)
        instance.delete()


class AbsenceViewSet(viewsets.ModelViewSet):
    serializer_class = AbsenceSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return Absence.objects.all()
        if hasattr(utilisateur, "enseignant"):
            return Absence.objects.filter(eleve__classe__in=utilisateur.enseignant.classes.all())
        if hasattr(utilisateur, "parent"):
            return Absence.objects.filter(eleve__in=utilisateur.parent.eleves.all())
        return Absence.objects.none()

    def _verifier_enseignant_ou_administrateur(self, utilisateur):
        if not hasattr(utilisateur, "enseignant") and not hasattr(utilisateur, "administrateur"):
            raise PermissionDenied("Seul un enseignant ou un administrateur peut gerer les absences.")

    def _verifier_perimetre_enseignant(self, utilisateur, eleve):
        if hasattr(utilisateur, "administrateur"):
            return
        if not utilisateur.enseignant.classes.filter(pk=eleve.classe_id).exists():
            raise PermissionDenied("Cet eleve n'est pas dans une de vos classes.")

    def perform_create(self, serializer):
        utilisateur = self.request.user
        self._verifier_enseignant_ou_administrateur(utilisateur)
        self._verifier_perimetre_enseignant(utilisateur, serializer.validated_data["eleve"])
        serializer.save(enregistree_par=utilisateur)

    def perform_update(self, serializer):
        utilisateur = self.request.user
        self._verifier_enseignant_ou_administrateur(utilisateur)
        eleve = serializer.validated_data.get("eleve", serializer.instance.eleve)
        self._verifier_perimetre_enseignant(utilisateur, eleve)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_enseignant_ou_administrateur(self.request.user)
        instance.delete()


class ObservationViewSet(viewsets.ModelViewSet):
    """
    Observations comportementales (positif/negatif/neutre) sur un eleve.
    Seul un enseignant de la classe de l'eleve (ou un administrateur) peut
    en creer/modifier/supprimer. Un parent ne voit que les observations
    marquees visible_parent=True concernant son propre enfant.
    """

    serializer_class = ObservationSerializer

    def get_queryset(self):
        utilisateur = self.request.user
        if hasattr(utilisateur, "administrateur"):
            return Observation.objects.all()
        if hasattr(utilisateur, "enseignant"):
            return Observation.objects.filter(eleve__classe__in=utilisateur.enseignant.classes.all())
        if hasattr(utilisateur, "parent"):
            return Observation.objects.filter(eleve__in=utilisateur.parent.eleves.all(), visible_parent=True)
        return Observation.objects.none()

    def _verifier_perimetre_enseignant(self, utilisateur, eleve):
        if hasattr(utilisateur, "administrateur"):
            return
        if not hasattr(utilisateur, "enseignant") or eleve.classe not in utilisateur.enseignant.classes.all():
            raise PermissionDenied("Cet eleve n'est pas dans une de vos classes.")

    def perform_create(self, serializer):
        utilisateur = self.request.user
        eleve = serializer.validated_data.get("eleve")
        self._verifier_perimetre_enseignant(utilisateur, eleve)
        serializer.save(enseignant=utilisateur)

    def perform_update(self, serializer):
        utilisateur = self.request.user
        eleve = serializer.validated_data.get("eleve", serializer.instance.eleve)
        self._verifier_perimetre_enseignant(utilisateur, eleve)
        serializer.save()

    def perform_destroy(self, instance):
        self._verifier_perimetre_enseignant(self.request.user, instance.eleve)
        instance.delete()


class BulletinViewSet(viewsets.ModelViewSet):
    serializer_class = BulletinSerializer
    permission_classes = [EstAdministrateurOuLectureSeule]

    def get_queryset(self):
        utilisateur = self.request.user
        if (
            hasattr(utilisateur, "administrateur")
            or utilisateur.is_superuser
            or utilisateur.is_staff
            or getattr(utilisateur, "role", "") == "administrateur"
        ):
            return Bulletin.objects.all().order_by("-date_generation", "-pk")
        if hasattr(utilisateur, "enseignant"):
            return Bulletin.objects.filter(
                eleve__classe__in=utilisateur.enseignant.classes.all()
            ).order_by("-date_generation", "-pk")
        if hasattr(utilisateur, "parent"):
            return Bulletin.objects.filter(
                eleve__in=utilisateur.parent.eleves.all()
            ).order_by("-date_generation", "-pk")
        return Bulletin.objects.none()

    @action(detail=False, methods=["post"], url_path="generer")
    def generer(self, request):
        """
        Genere (ou regenere) le bulletin d'un eleve pour un trimestre, en
        reutilisant EXACTEMENT le meme service que l'application Django
        (calcul de la moyenne ponderee, du rang, generation du PDF) : pas
        de logique dupliquee ou simplifiee cote API.
        Reserve a l'Administrateur.
        """
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Seul un administrateur peut generer un bulletin."}, status=403)

        eleve_id = request.data.get("eleve")
        trimestre = request.data.get("trimestre")
        if not eleve_id or not trimestre:
            return Response({"detail": "Les champs 'eleve' et 'trimestre' sont obligatoires."}, status=400)

        eleve = get_object_or_404(Eleve, pk=eleve_id)
        try:
            bulletin = generer_bulletin(eleve, int(trimestre))
        except ValueError as erreur:
            return Response({"detail": str(erreur)}, status=400)

        serializer = self.get_serializer(bulletin, context={"request": request})
        return Response(serializer.data, status=201)

    @extend_schema(
        request=GenerationBulletinsLotRequestSerializer,
        responses={200: inline_serializer(
            name="GenerationBulletinsLotResponse",
            fields={
                "bulletins": BulletinSerializer(many=True),
                "sans_notes": serializers.ListField(child=serializers.IntegerField()),
                "total_genere": serializers.IntegerField(),
            },
        )},
    )
    @action(detail=False, methods=["post"], url_path="generer-lot")
    def generer_lot(self, request):
        """Genere jusqu'a 500 bulletins et recalcule chaque classe une seule fois."""
        if not hasattr(request.user, "administrateur"):
            return Response({"detail": "Seul un administrateur peut generer des bulletins."}, status=403)

        entree = GenerationBulletinsLotRequestSerializer(data=request.data)
        entree.is_valid(raise_exception=True)
        eleve_ids = list(dict.fromkeys(entree.validated_data["eleves"]))
        eleves_par_id = {eleve.pk: eleve for eleve in Eleve.objects.filter(pk__in=eleve_ids).select_related("classe")}
        inconnus = [eleve_id for eleve_id in eleve_ids if eleve_id not in eleves_par_id]
        if inconnus:
            return Response({"detail": "Un ou plusieurs eleves sont introuvables.", "eleves_inconnus": inconnus}, status=400)

        trimestre = int(entree.validated_data["trimestre"])
        bulletins, sans_notes = generer_bulletins_lot(
            [eleves_par_id[eleve_id] for eleve_id in eleve_ids], trimestre
        )
        donnees = self.get_serializer(bulletins, many=True, context={"request": request}).data
        return Response({"bulletins": donnees, "sans_notes": sans_notes, "total_genere": len(donnees)})

    @action(detail=True, methods=["get"], url_path="telecharger")
    def telecharger(self, request, pk=None):
        """
        Telecharge le PDF d'un bulletin en passant par l'API (utilise par le
        frontend React). Regénère automatiquement à la volée si le fichier
        physique est manquant (ex: redémarrage serveur ou conteneur éphémère).
        """
        bulletin = get_object_or_404(self.get_queryset(), pk=pk)

        fichier_manquant = False
        if not bulletin.fichier_pdf:
            fichier_manquant = True
        else:
            try:
                if not os.path.exists(bulletin.fichier_pdf.path):
                    fichier_manquant = True
            except Exception:
                fichier_manquant = True

        if fichier_manquant:
            try:
                generer_bulletin(bulletin.eleve, bulletin.trimestre)
                bulletin.refresh_from_db()
            except Exception as e:
                raise Http404(f"Ce bulletin ne peut pas être généré : {e}")

        if not bulletin.fichier_pdf:
            raise Http404("Ce bulletin n'a pas pu être généré.")

        try:
            f = bulletin.fichier_pdf.open("rb")
        except Exception:
            generer_bulletin(bulletin.eleve, bulletin.trimestre)
            bulletin.refresh_from_db()
            f = bulletin.fichier_pdf.open("rb")

        nom_fichier = f"bulletin_{bulletin.eleve.matricule}_T{bulletin.trimestre}.pdf"
        reponse = FileResponse(f, as_attachment=True, filename=nom_fichier, content_type="application/pdf")
        reponse["Content-Disposition"] = f'attachment; filename="{nom_fichier}"'
        reponse["Access-Control-Expose-Headers"] = "Content-Disposition"
        return reponse


class CoursViewSet(viewsets.ModelViewSet):
    """
    Emploi du temps, utilise par React.
    Lecture : Administrateur (tout), Enseignant (ses propres creneaux
    uniquement), Parent (les creneaux des classes de ses enfants).
    Ecriture (creation/modification/suppression) : Administrateur uniquement.
    """

    serializer_class = CoursSerializer
    permission_classes = [EstAdministrateurOuLectureSeule]

    def get_queryset(self):
        utilisateur = self.request.user
        base = Cours.objects.select_related("classe", "matiere", "enseignant")
        if hasattr(utilisateur, "administrateur"):
            return base.all()
        if hasattr(utilisateur, "enseignant"):
            return base.filter(enseignant=utilisateur)
        if hasattr(utilisateur, "parent"):
            classes_enfants = [e.classe_id for e in utilisateur.parent.eleves.all() if e.classe_id]
            return base.filter(classe_id__in=classes_enfants)
        return Cours.objects.none()


@extend_schema(responses=inline_serializer(name="LigneSuiviSaisieNotes", fields={
    "enseignant": serializers.CharField(),
    "classe": serializers.CharField(),
    "matiere": serializers.CharField(),
    "trimestre": serializers.IntegerField(),
    "total_eleves": serializers.IntegerField(),
    "eleves_avec_note": serializers.IntegerField(),
    "statut": serializers.CharField(),
}, many=True))
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def suivi_saisie_notes(request):
    """
    Pour l'Administrateur : etat de la saisie des notes, croise par
    enseignant / classe / matiere, pour un trimestre donne. Permet de voir
    en un coup d'oeil qui a termine et qui est en retard.
    """
    if not hasattr(request.user, "administrateur"):
        return Response({"detail": "Reserve a l'administrateur."}, status=403)

    trimestre = request.query_params.get("trimestre", "1")
    try:
        trimestre = int(trimestre)
    except ValueError:
        trimestre = 1

    resultats = []
    for enseignant in Enseignant.objects.all().order_by("username"):
        for classe in enseignant.classes.all():
            total_eleves = Eleve.objects.filter(classe=classe).count()
            if total_eleves == 0:
                continue
            for matiere in enseignant.matieres.all():
                eleves_avec_note = Eleve.objects.filter(
                    classe=classe, notes__matiere=matiere, notes__trimestre=trimestre,
                ).distinct().count()

                if eleves_avec_note == 0:
                    statut = "pas_commence"
                elif eleves_avec_note >= total_eleves:
                    statut = "termine"
                else:
                    statut = "en_cours"

                resultats.append({
                    "enseignant": enseignant.get_full_name() or enseignant.username,
                    "classe": str(classe),
                    "matiere": matiere.nom,
                    "trimestre": trimestre,
                    "total_eleves": total_eleves,
                    "eleves_avec_note": eleves_avec_note,
                    "statut": statut,
                })

    return Response(resultats)


@extend_schema(
    request=inline_serializer(name="ImportElevesCsvRequest", fields={
        "fichier": serializers.FileField(),
    }),
    responses={200: inline_serializer(name="ImportElevesCsvResponse", fields={
        "crees": serializers.IntegerField(),
        "mis_a_jour": serializers.IntegerField(),
        "erreurs": serializers.ListField(child=serializers.DictField()),
    })},
)
@api_view(["POST"])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser])
def importer_eleves_csv(request):
    """
    Import en masse d'eleves depuis un fichier CSV, reserve a l'Administrateur.

    Colonnes attendues (avec en-tete) : matricule,nom,prenom,date_naissance,sexe,classe
    - date_naissance au format AAAA-MM-JJ
    - sexe : M ou F
    - classe : nom exact d'une classe deja existante (colonne "nom" de Classe)

    Un eleve existant (meme matricule) est mis a jour plutot que duplique.
    Renvoie un resume : nombre crees, nombre mis a jour, et la liste des
    lignes en erreur avec leur raison (pour corriger et reimporter).
    """
    if not hasattr(request.user, "administrateur"):
        return Response({"detail": "Seul un administrateur peut importer des eleves."}, status=403)

    fichier = request.FILES.get("fichier")
    if not fichier:
        return Response({"detail": "Aucun fichier recu. Le champ doit s'appeler 'fichier'."}, status=400)

    try:
        valider_taille_csv(fichier)
    except DjangoValidationError as erreur:
        return Response({"detail": erreur.message}, status=400)

    try:
        contenu = fichier.read().decode("utf-8-sig")
    except UnicodeDecodeError:
        return Response({"detail": "Le fichier doit etre encode en UTF-8 (ou UTF-8 avec BOM)."}, status=400)

    lecteur = csv.DictReader(io.StringIO(contenu))
    colonnes_requises = {"matricule", "nom", "prenom", "date_naissance", "sexe", "classe"}
    if lecteur.fieldnames is None or not colonnes_requises.issubset(set(lecteur.fieldnames)):
        return Response({
            "detail": "Colonnes manquantes. Attendu : matricule,nom,prenom,date_naissance,sexe,classe",
            "colonnes_trouvees": lecteur.fieldnames,
        }, status=400)

    crees = 0
    mis_a_jour = 0
    erreurs = []

    for numero_ligne, ligne in enumerate(lecteur, start=2):
        matricule = (ligne.get("matricule") or "").strip()
        nom = (ligne.get("nom") or "").strip()
        prenom = (ligne.get("prenom") or "").strip()
        date_naissance = (ligne.get("date_naissance") or "").strip()
        sexe = (ligne.get("sexe") or "").strip().upper()
        nom_classe = (ligne.get("classe") or "").strip()

        if not matricule or not nom or not prenom:
            erreurs.append({"ligne": numero_ligne, "raison": "matricule, nom et prenom sont obligatoires."})
            continue
        if sexe not in ("M", "F"):
            erreurs.append({"ligne": numero_ligne, "matricule": matricule, "raison": "sexe doit etre 'M' ou 'F'."})
            continue

        classe = Classe.objects.filter(nom=nom_classe).first()
        if nom_classe and classe is None:
            erreurs.append({"ligne": numero_ligne, "matricule": matricule, "raison": f"Classe '{nom_classe}' introuvable."})
            continue

        try:
            _obj, cree = Eleve.objects.update_or_create(
                matricule=matricule,
                defaults={
                    "nom": nom, "prenom": prenom, "sexe": sexe,
                    "date_naissance": date_naissance, "classe": classe,
                },
            )
        except Exception as erreur:
            erreurs.append({"ligne": numero_ligne, "matricule": matricule, "raison": str(erreur)})
            continue

        if cree:
            crees += 1
        else:
            mis_a_jour += 1

    return Response({
        "crees": crees,
        "mis_a_jour": mis_a_jour,
        "erreurs": erreurs,
        "total_traite": crees + mis_a_jour,
        "total_erreurs": len(erreurs),
    })


@extend_schema(
    summary="Indicateurs cles et KPIs de l'etablissement",
    description="Fournit les effectifs consolides, la parite, le taux d'assiduite, le taux de recouvrement et la synthese academique.",
    responses={200: inline_serializer(
        name="StatistiquesGlobalesResponse",
        fields={
            "eleves": serializers.DictField(),
            "classes": serializers.DictField(),
            "absences": serializers.DictField(),
            "finances": serializers.DictField(),
            "academique": serializers.DictField(),
        }
    )}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def statistiques_globales_view(request):
    """
    Indicateurs cles et KPIs de l'etablissement (reserve a l'Administrateur).
    Fournit les effectifs consolides, la parite filles/garcons, le taux d'assiduite,
    le taux de recouvrement financier et la synthese academique.
    """
    if not hasattr(request.user, "administrateur"):
        raise PermissionDenied("Seul un administrateur peut acceder aux statistiques globales.")

    from decimal import Decimal
    from paiements.models import FraisScolarite, Paiement

    total_eleves = Eleve.objects.count()
    filles = Eleve.objects.filter(sexe="F").count()
    garcons = Eleve.objects.filter(sexe="M").count()

    total_classes = Classe.objects.count()
    repartition_classes = []
    for c in Classe.objects.all().order_by("niveau", "nom"):
        repartition_classes.append({
            "id": c.id,
            "nom": c.nom,
            "niveau": c.niveau,
            "effectif": c.eleves.count(),
        })

    total_absences = Absence.objects.count()
    absences_justifiees = Absence.objects.filter(justifiee=True).count()
    absences_non_justifiees = Absence.objects.filter(justifiee=False).count()

    # Calcul financier global
    total_du = Decimal("0")
    for f in FraisScolarite.objects.select_related("classe"):
        nb_eleves_classe = f.classe.eleves.count()
        total_du += f.montant_du * nb_eleves_classe

    total_encaisse = sum((p.montant for p in Paiement.objects.all()), Decimal("0"))
    solde_restant = max(Decimal("0"), total_du - total_encaisse)
    taux_recouvrement = round((float(total_encaisse) / float(total_du) * 100), 1) if total_du > 0 else 0.0

    return Response({
        "eleves": {
            "total": total_eleves,
            "filles": filles,
            "garcons": garcons,
            "pct_filles": round(filles / total_eleves * 100, 1) if total_eleves > 0 else 0,
            "pct_garcons": round(garcons / total_eleves * 100, 1) if total_eleves > 0 else 0,
        },
        "classes": {
            "total": total_classes,
            "details": repartition_classes,
        },
        "absences": {
            "total": total_absences,
            "justifiees": absences_justifiees,
            "non_justifiees": absences_non_justifiees,
            "taux_justification_pct": round(absences_justifiees / total_absences * 100, 1) if total_absences > 0 else 100.0,
        },
        "finances": {
            "total_prevu": str(total_du),
            "total_encaisse": str(total_encaisse),
            "solde_restant": str(solde_restant),
            "taux_recouvrement_pct": taux_recouvrement,
        },
        "academique": {
            "total_notes": Note.objects.count(),
            "total_bulletins": Bulletin.objects.count(),
        },
    })


@extend_schema(
    summary="Exporter la liste d'une classe en CSV",
    description="Telechargement du fichier CSV compatible Excel listant les eleves et les contacts parents de la classe.",
    responses={200: OpenApiTypes.BINARY}
)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def exporter_classe_csv(request, classe_id):
    """
    Exporte la liste nominative des eleves d'une classe au format CSV UTF-8 (compatible Excel).
    Accessible a l'Administrateur et aux Enseignants affectes a cette classe.
    """
    classe = get_object_or_404(Classe, pk=classe_id)
    utilisateur = request.user
    if hasattr(utilisateur, "enseignant"):
        if not utilisateur.enseignant.classes.filter(pk=classe.pk).exists():
            raise PermissionDenied("Vous n'etes pas assigne a cette classe.")
    elif not hasattr(utilisateur, "administrateur"):
        raise PermissionDenied("Acces refuse.")

    from django.http import HttpResponse
    reponse = HttpResponse(content_type="text/csv; charset=utf-8")
    reponse["Content-Disposition"] = f'attachment; filename="eleves_{classe.nom.replace(" ", "_")}.csv"'
    reponse.write('\ufeff')  # BOM UTF-8 pour Excel

    redacteur = csv.writer(reponse, delimiter=';')
    redacteur.writerow(["Matricule", "Nom", "Prenom", "Sexe", "Date de naissance", "Classe", "Parents / Contacts"])

    for e in classe.eleves.all().order_by("nom", "prenom"):
        parents_liste = []
        for p in e.parents.all():
            nom_p = p.get_full_name() or p.username
            tel_p = p.telephone or ""
            parents_liste.append(f"{nom_p} ({tel_p})" if tel_p else nom_p)
        
        redacteur.writerow([
            e.matricule,
            e.nom,
            e.prenom,
            e.sexe,
            e.date_naissance.strftime("%d/%m/%Y") if e.date_naissance else "",
            classe.nom,
            ", ".join(parents_liste) if parents_liste else "-",
        ])
    return reponse

