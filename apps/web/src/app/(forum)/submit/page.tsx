import { ComposeForm } from '@/components/forum/compose/ComposeForm';

/**
 * /submit — full-bleed composer. Back navigation + the "New post" label
 * live in the shared ForumHeader (inner variant); the composer owns only
 * the form area below.
 */
export default function SubmitPage(): JSX.Element {
  return (
    <div className="flex min-h-[calc(100vh-48px)] flex-col bg-card-bg">
      <ComposeForm />
    </div>
  );
}
