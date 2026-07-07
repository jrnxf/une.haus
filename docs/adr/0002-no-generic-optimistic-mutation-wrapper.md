# No generic optimistic-mutation wrapper

Optimistic-mutation choreography (cancel → snapshot → set → rollback → settle) stays inline in each mutation hook; we deliberately do not introduce a `useOptimisticMutation` wrapper. The call sites diverge on query shape (plain vs infinite `{ pages }` data), rollback presence (`useDeletePost` has none), and side effects (haptics, per-type toasts, navigate, refetch keys), so the wrapper's interface would be as wide as the ~4 scaffold lines it hides — a shallow module. Each hook (`useLikeUnlikeRecord`, `useCreateMessage`, `useFollowMutations`, `useDeletePost`) is already the deep seam its callers consume.

Local dedup inside one hook file (e.g. collapsing the follow/unfollow inverse pair behind one transform parameter) is fine; a cross-domain generic is not.
