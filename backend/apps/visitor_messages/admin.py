from django.contrib import admin

from .models import VisitorMessage


@admin.register(VisitorMessage)
class VisitorMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "created_at")
    list_filter = ("subject",)
    search_fields = ("name", "email", "subject", "body")
    readonly_fields = ("created_at",)
