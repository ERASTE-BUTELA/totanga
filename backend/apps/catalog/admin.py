from django import forms
from django.contrib import admin
from django.db import models
from django.utils.html import format_html

from .models import Author, Book, Category, Copy, CopyStatus


class CatalogImageAdmin(admin.ModelAdmin):
    formfield_overrides = {
        models.ImageField: {
            "widget": forms.ClearableFileInput(
                attrs={
                    "accept": ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
                }
            ),
        },
    }


class CopyStatusFilter(admin.SimpleListFilter):
    title = "statut des exemplaires"
    parameter_name = "copy_status"

    def lookups(self, request, model_admin):
        return CopyStatus.choices

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(copies__status=self.value()).distinct()
        return queryset


class CopyInline(admin.TabularInline):
    model = Copy
    extra = 1
    fields = ("call_number", "section", "shelf", "status", "acquired_on")


@admin.register(Author)
class AuthorAdmin(CatalogImageAdmin):
    list_display = ("name",)
    search_fields = ("name",)
    fields = ("name", "biography", "photo", "photo_preview")
    readonly_fields = ("photo_preview",)

    @admin.display(description="Aperçu")
    def photo_preview(self, obj):
        if not obj.photo:
            return "Aucune photo"
        return format_html(
            '<img src="{}" alt="" style="max-height: 80px;">',
            obj.photo.url,
        )


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    fields = ("name", "slug", "description")
    readonly_fields = ("slug",)


@admin.register(Book)
class BookAdmin(CatalogImageAdmin):
    list_display = (
        "title",
        "author_list",
        "category",
        "publication_year",
        "language",
        "copy_count_display",
        "available_copy_count_display",
        "archived",
    )
    list_filter = ("category", "archived", CopyStatusFilter)
    search_fields = ("title", "authors__name", "isbn", "copies__call_number")
    search_help_text = "Titre, auteur, ISBN ou cote."
    filter_horizontal = ("authors",)
    readonly_fields = (
        "slug",
        "cover_preview",
        "copy_count_display",
        "available_copy_count_display",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "title",
                    "slug",
                    "authors",
                    "category",
                    "publication_year",
                    "language",
                )
            },
        ),
        ("Présentation", {"fields": ("summary", "cover", "cover_preview")}),
        ("Édition", {"fields": ("publisher", "isbn")}),
        (
            "Suivi",
            {
                "fields": (
                    "archived",
                    "copy_count_display",
                    "available_copy_count_display",
                    "created_at",
                    "updated_at",
                )
            },
        ),
    )
    inlines = (CopyInline,)
    actions = ("archive_books",)

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .with_copy_counts()
            .select_related("category")
            .prefetch_related("authors")
        )

    def has_delete_permission(self, request, obj=None):
        return False

    def get_actions(self, request):
        actions = super().get_actions(request)
        actions.pop("delete_selected", None)
        return actions

    @admin.action(description="Archiver les livres sélectionnés")
    def archive_books(self, request, queryset):
        count = queryset.update(archived=True)
        self.message_user(request, f"{count} livre(s) archivé(s).")

    @admin.display(description="Auteurs")
    def author_list(self, obj):
        names = [author.name for author in obj.authors.all()]
        return ", ".join(names) if names else "—"

    @admin.display(description="Exemplaires")
    def copy_count_display(self, obj):
        if not obj.pk:
            return 0
        return obj.copy_count

    @admin.display(description="Disponibles")
    def available_copy_count_display(self, obj):
        if not obj.pk:
            return 0
        return obj.available_copy_count

    @admin.display(description="Aperçu")
    def cover_preview(self, obj):
        if not obj.cover:
            return "Aucune couverture"
        return format_html(
            '<img src="{}" alt="" style="max-height: 120px;">',
            obj.cover.url,
        )
