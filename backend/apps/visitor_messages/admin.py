from django.contrib import admin

from .models import VisitorMessage, VisitorMessageReply


class VisitorMessageReplyInline(admin.TabularInline):
    model = VisitorMessageReply
    extra = 0
    readonly_fields = ("body", "channel", "actor_name", "created_at", "actor")
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(VisitorMessage)
class VisitorMessageAdmin(admin.ModelAdmin):
    list_display = ("name", "subject", "email", "whatsapp", "created_at")
    list_filter = ("subject", "kind", "is_read")
    search_fields = ("name", "email", "whatsapp", "subject", "body")
    readonly_fields = ("created_at",)
    inlines = [VisitorMessageReplyInline]
