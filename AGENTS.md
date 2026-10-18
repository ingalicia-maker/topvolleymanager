# Project rules

- Rating edits must pass the stored rating to the shared score serializer so inactive builtin and custom scores survive form updates; creation uses the same serializer without a stored rating.
- Public access policies obtain the authenticated email from `auth.email()` and validate global admins through `public.is_app_admin`; direct reads of `auth.users` require privileges unavailable to application users.