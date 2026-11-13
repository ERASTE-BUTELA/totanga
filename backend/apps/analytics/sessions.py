"""Calcul des séjours (visites) à partir des événements, sans cookie."""

from datetime import timedelta

SESSION_GAP = timedelta(minutes=30)


def is_new_visit(*, previous_at, now, previous_day, day):
    """Une nouvelle visite après 30 minutes d'inactivité, ou un autre jour."""

    if previous_at is None:
        return True
    if previous_day != day:
        return True
    return (now - previous_at) >= SESSION_GAP


def count_visits_from_timestamps(moments):
    """Compte les séjours dans une suite chronologique d'instants (même visiteur)."""

    ordered = sorted(moments)
    if not ordered:
        return 0
    visits = 1
    previous = ordered[0]
    for moment in ordered[1:]:
        if (moment - previous) >= SESSION_GAP or moment.date() != previous.date():
            visits += 1
        previous = moment
    return visits
