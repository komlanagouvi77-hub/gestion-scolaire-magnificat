"""
Module des passerelles de paiement Mobile Money pour le Togo.
Design Pattern : Adapter (Fournisseur de service de paiement)

Prend en charge les deux references majeures du marche togolais :
1. PayGate Global (Passerelle 100% togolaise de reference - Togocom T-Money & Moov Flooz)
2. FedaPay (Passerelle sous-regionale UEMOA)
3. Mode Securise Integre (pour la soutenance ESGIS et l'environnement hors-ligne)
"""
import json
import logging
import os
import urllib.error
import urllib.request
from decimal import Decimal
from django.conf import settings

logger = logging.getLogger(__name__)


class ReponsePasserelle:
    def __init__(self, succes, reference_passerelle="", url_paiement=None, message="", donnees_brutes=None):
        self.succes = succes
        self.reference_passerelle = reference_passerelle
        self.url_paiement = url_paiement
        self.message = message
        self.donnees_brutes = donnees_brutes or {}


class PasserellePayGateGlobal:
    """
    Integration officielle de PayGate Global Togo (https://paygateglobal.com).
    La solution de reference concue a Lome pour T-Money et Flooz.
    API REST : https://paygateglobal.com/api/v1/pay
    """
    NOM = "PayGate Global Togo"
    API_URL = "https://paygateglobal.com/api/v1/pay"

    def __init__(self, auth_token=None):
        self.auth_token = auth_token or getattr(settings, "PAYGATE_AUTH_TOKEN", "") or os.environ.get("PAYGATE_AUTH_TOKEN", "")

    def est_active(self):
        return bool(self.auth_token)

    def initier_paiement(self, reference, montant, operateur, telephone, description):
        reseau = "TMONEY" if operateur == "tmoney" else "FLOOZ"
        payload = {
            "auth_token": self.auth_token,
            "phone_number": telephone,
            "amount": int(Decimal(str(montant))),
            "description": description,
            "identifier": reference,
            "network": reseau,
        }

        try:
            req = urllib.request.Request(
                self.API_URL,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "Magnificat-Scolaire-Togo/1.0"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                status = res_data.get("status")
                tx_ref = res_data.get("tx_reference", "")
                if status == 0:
                    return ReponsePasserelle(
                        succes=True,
                        reference_passerelle=tx_ref,
                        message=f"Demande transmise avec succes a {reseau} (PayGate Global).",
                        donnees_brutes=res_data,
                    )
                else:
                    return ReponsePasserelle(
                        succes=False,
                        message=res_data.get("message", "Echec de connexion a l'operateur."),
                        donnees_brutes=res_data,
                    )
        except Exception as e:
            logger.warning("Erreur PayGate Global API: %s", e)
            return ReponsePasserelle(succes=False, message=str(e))


class PasserelleFedaPay:
    """
    Integration officielle FedaPay UEMOA (https://fedapay.com).
    Partenaire officiel Togocom T-Money et Moov Flooz.
    """
    NOM = "FedaPay UEMOA"

    def __init__(self, secret_key=None, environnement="live"):
        self.secret_key = secret_key or getattr(settings, "FEDAPAY_SECRET_KEY", "") or os.environ.get("FEDAPAY_SECRET_KEY", "")
        self.environnement = environnement or getattr(settings, "FEDAPAY_ENVIRONMENT", "live") or os.environ.get("FEDAPAY_ENVIRONMENT", "live")
        self.api_host = "https://api.fedapay.com/v1" if self.environnement == "live" else "https://sandbox-api.fedapay.com/v1"

    def est_active(self):
        return bool(self.secret_key)

    def initier_paiement(self, reference, montant, operateur, telephone, description, client_email="", client_nom="", callback_url=""):
        payload = {
            "description": description,
            "amount": int(Decimal(str(montant))),
            "currency": {"iso": "XOF"},
            "callback_url": callback_url,
            "customer": {
                "firstname": client_nom or "Parent",
                "lastname": "Eleve",
                "email": client_email or "comptabilite@magnificat-scolaire.tg",
                "phone_number": {"number": telephone, "country": "TG"},
            },
        }

        try:
            req = urllib.request.Request(
                f"{self.api_host}/transactions",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {self.secret_key}",
                    "Content-Type": "application/json",
                    "User-Agent": "Magnificat-Scolaire/1.0",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=12) as response:
                res_data = json.loads(response.read().decode("utf-8"))
                tx = res_data.get("v1/transaction") or res_data.get("transaction") or {}
                tx_id = str(tx.get("id", ""))

                token_req = urllib.request.Request(
                    f"{self.api_host}/transactions/{tx_id}/token",
                    data=b"{}",
                    headers={"Authorization": f"Bearer {self.secret_key}", "Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(token_req, timeout=12) as tok_res:
                    tok_data = json.loads(tok_res.read().decode("utf-8"))
                    url = tok_data.get("url")
                    return ReponsePasserelle(
                        succes=True,
                        reference_passerelle=tx_id,
                        url_paiement=url,
                        message="Transaction FedaPay initialisee.",
                        donnees_brutes=res_data,
                    )
        except Exception as e:
            logger.warning("Erreur FedaPay API: %s", e)
            return ReponsePasserelle(succes=False, message=str(e))


def obtenir_gestionnaire_paiement():
    """
    Renvoie la passerelle active pour le Complexe Scolaire Magnificat.
    Ordre de priorite :
    1. PayGate Global (la reference togolaise direct T-Money / Flooz) si PAYGATE_AUTH_TOKEN est present
    2. FedaPay si FEDAPAY_SECRET_KEY est present
    3. Mode de demonstration/soutenance automatique
    """
    paygate = PasserellePayGateGlobal()
    if paygate.est_active():
        return paygate

    fedapay = PasserelleFedaPay()
    if fedapay.est_active():
        return fedapay

    return None

