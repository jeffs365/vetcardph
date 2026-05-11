import { useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ChevronLeft, Lightbulb, MessageSquareText, Send } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { FormField } from "@/components/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { apiRequest, type FeedbackCategory, type FeedbackItem } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { formatDateTime, formatFeedbackCategory, getErrorMessage } from "@/lib/format";
import { toast } from "sonner";

const feedbackSchema = z.object({
  category: z.enum(["BUG", "IDEA", "FEATURE_REQUEST", "GENERAL"]),
  message: z.string().trim().min(10, "Please add a bit more detail.").max(2000, "Keep feedback under 2000 characters."),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

const inputCls =
  "w-full h-11 px-3 rounded-lg border border-border bg-card focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

const feedbackTone: Record<FeedbackCategory, "danger" | "warn" | "info" | "neutral"> = {
  BUG: "danger",
  IDEA: "warn",
  FEATURE_REQUEST: "info",
  GENERAL: "neutral",
};

export default function AccountFeedback() {
  const queryClient = useQueryClient();
  const { token, user } = useSession();
  const feedbackQuery = useQuery({
    queryKey: ["feedback", "mine"],
    queryFn: () => apiRequest<{ feedback: FeedbackItem[] }>("/feedback?mine=true&limit=5", { token }),
    enabled: Boolean(token),
  });

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      category: "BUG",
      message: "",
    },
  });

  const recentFeedback = useMemo(() => feedbackQuery.data?.feedback ?? [], [feedbackQuery.data?.feedback]);

  const submitFeedback = useMutation({
    mutationFn: (values: FeedbackFormValues) =>
      apiRequest("/feedback", {
        method: "POST",
        token,
        body: values,
      }),
    onSuccess: async () => {
      form.reset({ category: "BUG", message: "" });
      await queryClient.invalidateQueries({ queryKey: ["feedback"] });
      toast.success("Feedback saved. Thanks for helping improve VetCard.");
    },
  });

  const handleSubmit = form.handleSubmit((values) => submitFeedback.mutate(values));

  return (
    <AppLayout
      title="Feedback"
      titleHref={null}
      headerStart={
        <Link
          to="/account"
          aria-label="Back to account"
          className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-5" />
        </Link>
      }
    >
      <section className="space-y-6 px-5 pb-6 pt-4">
        <section className="index-card bg-gradient-to-br from-card via-card to-accent/40">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
              <Lightbulb className="size-5" />
            </span>
            <div>
              <div className="font-semibold">Real feedback flow</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Submissions are now saved from <span className="font-medium text-foreground">{user?.clinicName}</span> under your account.
              </div>
            </div>
          </div>
        </section>

        <section className="index-card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Category" required error={form.formState.errors.category?.message}>
              <select className={inputCls} {...form.register("category")}>
                <option value="BUG">Bug</option>
                <option value="IDEA">Idea</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="GENERAL">General</option>
              </select>
            </FormField>

            <FormField label="Message" required error={form.formState.errors.message?.message} hint={`${form.watch("message").length}/2000`}>
              <textarea
                className={`${inputCls} h-36 py-3`}
                placeholder="Tell us what happened, what feels rough, or what would make the workflow better."
                {...form.register("message")}
              />
            </FormField>

            {submitFeedback.isError ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                {getErrorMessage(submitFeedback.error)}
              </div>
            ) : null}

            <Button type="submit" variant="hero" size="lg" disabled={submitFeedback.isPending}>
              <Send className="size-4" />
              {submitFeedback.isPending ? "Sending..." : "Submit Feedback"}
            </Button>
          </form>
        </section>

        <section>
          <div className="mb-3">
            <h2 className="font-display text-xl font-bold">Recent Submissions</h2>
            <p className="text-sm text-muted-foreground">Your latest saved notes and requests.</p>
          </div>

          {feedbackQuery.isLoading ? (
            <div className="index-card text-center text-muted-foreground">Loading feedback history...</div>
          ) : feedbackQuery.isError ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive-soft px-4 py-3 text-sm text-destructive">
              {getErrorMessage(feedbackQuery.error)}
            </div>
          ) : recentFeedback.length ? (
            <div className="space-y-3">
              {recentFeedback.map((item) => (
                <div key={item.id} className="index-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge tone={feedbackTone[item.category]}>{formatFeedbackCategory(item.category)}</StatusBadge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div className="mt-3 whitespace-pre-wrap text-sm text-foreground">{item.message}</div>
                    </div>
                    <MessageSquareText className="size-4 shrink-0 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="index-card text-center text-muted-foreground">No feedback submitted yet.</div>
          )}
        </section>
      </section>
    </AppLayout>
  );
}
