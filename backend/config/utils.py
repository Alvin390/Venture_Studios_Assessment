from apps.accounts.models import Profile


def get_effective_profile(request):
    """
    Returns the profile to use for ownership scoping.

    Admins can pass ?as_user=<id> to act on behalf of any customer.
    If the id doesn't resolve to a real profile, falls back to the admin's own profile.
    """
    as_user_id = request.query_params.get("as_user")
    if as_user_id and request.profile and request.profile.is_admin:
        try:
            return Profile.objects.get(id=as_user_id)
        except (Profile.DoesNotExist, ValueError):
            pass
    return request.profile
