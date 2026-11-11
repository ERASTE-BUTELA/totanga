"""Contrôle de santé pour les conteneurs et le reverse proxy."""

from django.db import connection
from django.http import JsonResponse


def health(_request):
    connection.ensure_connection()
    return JsonResponse({"status": "ok"})
