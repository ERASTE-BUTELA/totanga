from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import StaffAction, User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    pass


@admin.register(StaffAction)
class StaffActionAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor", "action", "target_type", "target_id")
    readonly_fields = ("created_at", "actor", "action", "target_type", "target_id")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
