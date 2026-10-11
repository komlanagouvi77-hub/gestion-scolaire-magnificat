from django import forms

from .models import DemandeInscription, Enseignant, Parametres, Parent

class ParametresForm(forms.ModelForm):
    """Modification de la configuration de l'etablissement (nom, logo, coordonnees), depuis l'application."""

    class Meta:
        model = Parametres
        fields = [
            "nom_ecole", "logo", "adresse", "telephone", "email", "annee_scolaire_active", "systeme_periodes",
            "cachet", "signature", "nom_signataire", "titre_signataire",
        ]
        labels = {
            "nom_ecole": "Nom de l'ecole",
            "logo": "Logo de l'ecole",
            "adresse": "Adresse",
            "telephone": "Telephone",
            "email": "Email",
            "annee_scolaire_active": "Annee scolaire active",
            "systeme_periodes": "Systeme de periodes",
            "cachet": "Cachet officiel (imprime sur les bulletins)",
            "signature": "Signature du chef d'etablissement",
            "nom_signataire": "Nom complet du signataire",
            "titre_signataire": "Titre du signataire",
        }


class EnseignantCreationForm(forms.ModelForm):
    """
    Formulaire de creation d'un compte Enseignant depuis l'application
    (aucun besoin de passer par /admin/). Le mot de passe est saisi en
    clair une seule fois, puis hache par set_password().
    """

    password = forms.CharField(
        label="Mot de passe", widget=forms.PasswordInput, min_length=8,
        help_text="Au moins 8 caracteres.",
    )

    class Meta:
        model = Enseignant
        fields = ["username", "first_name", "last_name", "email", "telephone", "specialite", "matieres", "classes"]
        labels = {
            "username": "Nom d'utilisateur",
            "first_name": "Prenom",
            "last_name": "Nom",
            "email": "Email",
            "telephone": "Telephone",
            "specialite": "Specialite",
        }
        widgets = {
            "matieres": forms.CheckboxSelectMultiple(),
            "classes": forms.CheckboxSelectMultiple(),
        }

    def save(self, commit=True):
        enseignant = super().save(commit=False)
        enseignant.set_password(self.cleaned_data["password"])
        if commit:
            enseignant.save()
            self.save_m2m()
        return enseignant


class EnseignantModificationForm(forms.ModelForm):
    """
    Modification d'un enseignant existant. Le mot de passe est optionnel :
    laisse vide, il n'est pas touche ; rempli, il remplace l'ancien
    (permet a l'Administrateur de reinitialiser un mot de passe oublie
    sans passer par /admin/).
    """

    password = forms.CharField(
        label="Nouveau mot de passe", widget=forms.PasswordInput, required=False, min_length=8,
        help_text="Laisser vide pour ne pas changer le mot de passe.",
    )

    class Meta:
        model = Enseignant
        fields = ["first_name", "last_name", "email", "telephone", "specialite", "matieres", "classes"]
        labels = {
            "first_name": "Prenom",
            "last_name": "Nom",
            "email": "Email",
            "telephone": "Telephone",
            "specialite": "Specialite",
        }
        widgets = {
            "matieres": forms.CheckboxSelectMultiple(),
            "classes": forms.CheckboxSelectMultiple(),
        }

    def save(self, commit=True):
        enseignant = super().save(commit=False)
        nouveau_mot_de_passe = self.cleaned_data.get("password")
        if nouveau_mot_de_passe:
            enseignant.set_password(nouveau_mot_de_passe)
        if commit:
            enseignant.save()
            self.save_m2m()
        return enseignant


class ParentCreationForm(forms.ModelForm):
    password = forms.CharField(
        label="Mot de passe", widget=forms.PasswordInput, min_length=8,
        help_text="Au moins 8 caracteres.",
    )

    class Meta:
        model = Parent
        fields = ["username", "first_name", "last_name", "email", "telephone", "profession", "eleves"]
        labels = {
            "username": "Nom d'utilisateur",
            "first_name": "Prenom",
            "last_name": "Nom",
            "email": "Email",
            "telephone": "Telephone",
            "profession": "Profession",
            "eleves": "Enfant(s)",
        }
        widgets = {
            "eleves": forms.CheckboxSelectMultiple(),
        }

    def save(self, commit=True):
        parent = super().save(commit=False)
        parent.set_password(self.cleaned_data["password"])
        if commit:
            parent.save()
            self.save_m2m()
        return parent


class ParentModificationForm(forms.ModelForm):
    """Modification d'un parent existant, avec reinitialisation optionnelle du mot de passe."""

    password = forms.CharField(
        label="Nouveau mot de passe", widget=forms.PasswordInput, required=False, min_length=8,
        help_text="Laisser vide pour ne pas changer le mot de passe.",
    )

    class Meta:
        model = Parent
        fields = ["first_name", "last_name", "email", "telephone", "profession", "eleves"]
        labels = {
            "first_name": "Prenom",
            "last_name": "Nom",
            "email": "Email",
            "telephone": "Telephone",
            "profession": "Profession",
            "eleves": "Enfant(s)",
        }
        widgets = {
            "eleves": forms.CheckboxSelectMultiple(),
        }

    def save(self, commit=True):
        parent = super().save(commit=False)
        nouveau_mot_de_passe = self.cleaned_data.get("password")
        if nouveau_mot_de_passe:
            parent.set_password(nouveau_mot_de_passe)
        if commit:
            parent.save()
            self.save_m2m()
        return parent
class DemandeInscriptionForm(forms.ModelForm):
    """
    Formulaire public de demande d'acces (Enseignant ou Parent). Le mot de
    passe choisi est saisi une seule fois puis hache immediatement dans
    save() : il n'est jamais conserve en clair, meme temporairement.
    """

    password = forms.CharField(
        label="Mot de passe souhaite", widget=forms.PasswordInput, min_length=8,
        help_text="Au moins 8 caracteres. Ce sera votre mot de passe si votre demande est approuvee.",
    )

    class Meta:
        model = DemandeInscription
        fields = [
            "type_compte", "username_souhaite", "password", "first_name", "last_name",
            "email", "telephone", "specialite", "profession", "matricules_enfants",
        ]
        labels = {
            "type_compte": "Je suis",
            "username_souhaite": "Nom d'utilisateur souhaite",
            "first_name": "Prenom",
            "last_name": "Nom",
            "email": "Email",
            "telephone": "Telephone",
            "specialite": "Specialite (si Enseignant)",
            "profession": "Profession (si Parent)",
            "matricules_enfants": "Matricule(s) de vos enfants (si Parent, separes par des virgules)",
        }
        widgets = {
            "type_compte": forms.RadioSelect(),
        }

    def save(self, commit=True):
        from django.contrib.auth.hashers import make_password
        demande = super().save(commit=False)
        demande.mot_de_passe_hache = make_password(self.cleaned_data["password"])
        if commit:
            demande.save()
        return demande
class DemandeInscriptionForm(forms.ModelForm):
    """
    Formulaire public de demande d'acces (Enseignant ou Parent). Le mot de
    passe choisi est saisi une seule fois puis hache immediatement dans
    save() : il n'est jamais conserve en clair, meme temporairement.
    """

    password = forms.CharField(
        label="Mot de passe souhaite", widget=forms.PasswordInput, min_length=8,
        help_text="Au moins 8 caracteres. Ce sera votre mot de passe si votre demande est approuvee.",
    )

    class Meta:
        model = DemandeInscription
        fields = [
            "type_compte", "username_souhaite", "password", "first_name", "last_name",
            "email", "telephone", "specialite", "profession", "matricules_enfants",
        ]
        labels = {
            "type_compte": "Je suis",
            "username_souhaite": "Nom d'utilisateur souhaite",
            "first_name": "Prenom",
            "last_name": "Nom",
            "email": "Email",
            "telephone": "Telephone",
            "specialite": "Specialite (si Enseignant)",
            "profession": "Profession (si Parent)",
            "matricules_enfants": "Matricule(s) de vos enfants (si Parent, separes par des virgules)",
        }
        widgets = {
            "type_compte": forms.RadioSelect(),
        }

    def save(self, commit=True):
        from django.contrib.auth.hashers import make_password
        demande = super().save(commit=False)
        demande.mot_de_passe_hache = make_password(self.cleaned_data["password"])
        if commit:
            demande.save()
        return demande