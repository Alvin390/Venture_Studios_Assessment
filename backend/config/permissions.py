from rest_framework.permissions import BasePermission


class IsAuthenticated(BasePermission):
    """Passes if the request carries a valid Supabase JWT that resolves to a Profile."""

    message = "Authentication required."

    def has_permission(self, request, view):
        return bool(request.profile)


class IsAdmin(BasePermission):
    """Passes only for admin-role profiles."""

    message = "Admin access required."

    def has_permission(self, request, view):
        return bool(request.profile) and request.profile.role == "admin"


class IsAdminOrOwner(BasePermission):
    """
    Admins can do everything.
    Customers pass the permission check here; ownership is enforced at the
    queryset level (get_queryset filters by owner) to prevent IDOR.
    """

    message = "Authentication required."

    def has_permission(self, request, view):
        return bool(request.profile)
