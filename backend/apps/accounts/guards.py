"""Garde-fous qui s'appliquent à tous les comptes, y compris le super-utilisateur."""

from django.contrib.auth.models import Group
from django.db.models.signals import m2m_changed

from apps.accounts.roles import ROLE_ADMIN


class LastAdministratorError(Exception):
    """Le dernier administrateur actif ne peut pas disparaître."""


def _others_exist(user):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return User.objects.filter(is_active=True, groups__name=ROLE_ADMIN).exclude(pk=user.pk).exists()


def is_last_active_administrator(user):
    if not getattr(user, "pk", None) or not user.is_active:
        return False
    if not user.groups.filter(name=ROLE_ADMIN).exists():
        return False
    return not _others_exist(user)


def ensure_administrator_remains(user):
    if is_last_active_administrator(user):
        raise LastAdministratorError(
            "Le dernier administrateur ne peut pas être désactivé, retiré ou supprimé."
        )


def guard_administrator_group(sender, instance, action, reverse, pk_set, **kwargs):
    if action not in {"pre_remove", "pre_clear"}:
        return
    from django.contrib.auth import get_user_model

    User = get_user_model()
    if reverse:
        if getattr(instance, "name", "") != ROLE_ADMIN:
            return
        users = instance.user_set.all() if action == "pre_clear" else User.objects.filter(pk__in=pk_set or [])
        for user in users:
            ensure_administrator_remains(user)
        return
    admin = Group.objects.filter(name=ROLE_ADMIN).only("pk").first()
    if admin is None:
        return
    if action == "pre_remove" and admin.pk not in set(pk_set or []):
        return
    if action == "pre_clear" and not instance.groups.filter(pk=admin.pk).exists():
        return
    ensure_administrator_remains(instance)


def connect_guards():
    from django.contrib.auth import get_user_model

    User = get_user_model()
    m2m_changed.connect(
        guard_administrator_group,
        sender=User.groups.through,
        dispatch_uid="totanga_guard_administrator_group",
    )
