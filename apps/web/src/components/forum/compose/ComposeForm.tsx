'use client';

import { useRef, useState, type MutableRefObject } from 'react';
import { useForm, Controller, type UseFormRegister } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createPostSchema, type CreatePostInput } from '@/lib/zod/post';
import { useCreatePost } from '@/hooks/use-posts';
import {
  MarkdownToolbar,
  applyMarkdownCommand,
  type MarkdownCommand,
} from './MarkdownToolbar';
import { WritePreviewTabs, type WritePreviewMode } from './WritePreviewTabs';
import { MarkdownPreview } from './MarkdownPreview';
import { ComposeChecklist } from './ComposeChecklist';
import { PublishingInfoCard } from './PublishingInfoCard';
import { TagPicker } from './TagPicker';

const TITLE_MAX = 200;
const BODY_MAX = 10_000;

/**
 * Textarea that plugs into RHF while still exposing its DOM node to the
 * parent so the Markdown toolbar can mutate selection directly.
 */
function BodyTextarea({
  register,
  textareaRef,
  invalid,
}: {
  register: UseFormRegister<CreatePostInput>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
  invalid: boolean;
}): JSX.Element {
  const { ref: rhfRef, ...rest } = register('body');
  return (
    <textarea
      {...rest}
      ref={(el) => {
        rhfRef(el);
        textareaRef.current = el;
      }}
      maxLength={BODY_MAX}
      rows={14}
      placeholder="Share the details using Markdown."
      className={cn(
        'w-full min-h-[340px] rounded-lg border border-border-strong bg-card-bg',
        'px-4 py-4 text-sm leading-[1.75] text-text-primary outline-none',
        'transition-colors focus:border-brand-blue',
        invalid && 'border-status-locked/60',
      )}
      aria-invalid={invalid}
    />
  );
}

/**
 * Full compose experience assembled from sub-components. Spec calls for:
 *  - RHF + zodResolver(createPostSchema)
 *  - Markdown toolbar that mutates the body textarea selection
 *  - Write / Preview tabs, preview via shared Markdown renderer
 *  - 1–3 tag picker with inline validation
 *  - Live checklist on the side rail
 *  - Footer with Save draft (disabled stub) + Publish (primary)
 *  - No header duplicate CTAs — everything lives in the footer
 */
export function ComposeForm(): JSX.Element {
  const router = useRouter();
  const mutation = useCreatePost();
  const [editorMode, setEditorMode] = useState<WritePreviewMode>('write');
  const [previewSeen, setPreviewSeen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const form = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
    defaultValues: { title: '', body: '', tagIds: [] },
    mode: 'onTouched',
  });

  const { register, handleSubmit, control, setValue, watch, formState } = form;
  const title = watch('title');
  const body = watch('body');
  const tagIds = watch('tagIds');

  const onModeChange = (next: WritePreviewMode) => {
    setEditorMode(next);
    if (next === 'preview') setPreviewSeen(true);
  };

  const onCommand = (cmd: MarkdownCommand) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const next = applyMarkdownCommand(
      cmd,
      ta.value,
      ta.selectionStart ?? ta.value.length,
      ta.selectionEnd ?? ta.value.length,
    );
    setValue('body', next.value, { shouldValidate: true, shouldDirty: true });
    // Restore selection on the next tick so React's update lands first.
    window.requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    const created = await mutation.mutateAsync(values);
    router.push(`/p/${created.id}`);
  });

  const titleError = formState.errors.title?.message;
  const bodyError = formState.errors.body?.message;
  const tagError = formState.errors.tagIds?.message;

  const apiError = mutation.isError ? (mutation.error as Error).message : null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-1 flex-col bg-card-bg"
      noValidate
    >
      <div className="flex flex-1 flex-col">
        {/* ── Main column ──────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-compose-wrap px-6 py-10 md:px-14 md:py-11">
            <header className="mb-7 border-b border-border-strong pb-8">
              <h1 className="text-[44px] font-extrabold leading-[1.04] tracking-tight text-text-primary">
                Create Post
              </h1>
              <p className="mt-3 max-w-[720px] text-[15px] leading-[1.6] text-text-muted">
                Start with the essentials, then refine the content and preview
                exactly what members will read.
              </p>
            </header>

            <div className="grid grid-cols-1 gap-7 md:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
              {/* Left: form card */}
              <div className="min-w-0">
                <div className="rounded-lg border border-border-strong bg-card-bg p-8 shadow-skep-sm md:p-10">
                  {/* Post identity block */}
                  <section className="mb-8">
                    <div className="mb-7 text-[17px] font-bold tracking-tight text-brand-blue">
                      Post identity
                    </div>

                    {/* Title */}
                    <div className="mb-6">
                      <label className="mb-2.5 block text-[13.5px] font-bold tracking-tight text-text-secondary">
                        Title
                        <span className="ml-0.5 text-status-locked">*</span>
                      </label>
                      <input
                        {...register('title')}
                        maxLength={TITLE_MAX}
                        placeholder="What's your post about? Keep it specific."
                        className={cn(
                          'w-full rounded-lg border border-border-strong bg-card-bg px-4 py-3.5',
                          'text-sm text-text-primary outline-none transition-colors',
                          'focus:border-brand-blue',
                          titleError && 'border-status-locked/60',
                        )}
                        aria-invalid={Boolean(titleError)}
                      />
                      <div className="mt-2.5 flex items-center justify-between gap-4">
                        <span className="text-[12.5px] leading-[1.6] text-text-muted">
                          Make it clear enough that someone can decide to open
                          it in one glance.
                        </span>
                        <span className="text-[12.5px] font-semibold text-text-secondary">
                          {title.length} / {TITLE_MAX}
                        </span>
                      </div>
                      {titleError ? (
                        <div className="mt-2.5 text-[12.5px] leading-[1.5] text-status-locked">
                          A title is required and must stay within 200
                          characters.
                        </div>
                      ) : null}
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="mb-2.5 block text-[13.5px] font-bold tracking-tight text-text-secondary">
                        Tags
                        <span className="ml-0.5 text-status-locked">*</span>
                        <span className="ml-2 text-xs font-medium text-text-muted">
                          · required · choose up to 3
                        </span>
                      </label>
                      <Controller
                        control={control}
                        name="tagIds"
                        render={({ field }) => (
                          <TagPicker
                            value={field.value}
                            onChange={field.onChange}
                            error={tagError}
                          />
                        )}
                      />
                    </div>
                  </section>

                  {/* Body block */}
                  <section>
                    <div className="mb-7 text-[17px] font-bold tracking-tight text-brand-blue">
                      Body
                    </div>

                    <label className="mb-2.5 block text-[13.5px] font-bold tracking-tight text-text-secondary">
                      Body
                      <span className="ml-0.5 text-status-locked">*</span>
                      <span className="ml-2 text-xs font-medium text-text-muted">
                        · Markdown only · no raw HTML
                      </span>
                    </label>

                    <WritePreviewTabs mode={editorMode} onChange={onModeChange} />

                    {editorMode === 'write' ? (
                      <>
                        <MarkdownToolbar onCommand={onCommand} />
                        <BodyTextarea
                          register={register}
                          textareaRef={textareaRef}
                          invalid={Boolean(bodyError)}
                        />
                      </>
                    ) : (
                      <MarkdownPreview source={body} />
                    )}

                    <div className="mt-2.5 flex items-center justify-between gap-4">
                      <span className="text-[12.5px] leading-[1.6] text-text-muted">
                        Use <code className="rounded-sm bg-page-bg px-1">@handle</code>{' '}
                        to mention members. Content is sanitized on render.
                      </span>
                      <span className="text-[12.5px] font-semibold text-text-secondary">
                        {body.length} / {BODY_MAX}
                      </span>
                    </div>
                    {bodyError ? (
                      <div className="mt-2.5 text-[12.5px] leading-[1.5] text-status-locked">
                        Body is required and must stay within 10,000 characters.
                      </div>
                    ) : null}
                  </section>

                  {apiError ? (
                    <div
                      role="alert"
                      className={cn(
                        'mt-5 rounded-md border border-status-locked/40 bg-status-locked-bg',
                        'px-4 py-3.5 text-[12.5px] leading-[1.55] text-status-locked',
                      )}
                    >
                      Couldn&rsquo;t publish: {apiError}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right: rail */}
              <aside className="min-w-0">
                <ComposeChecklist
                  state={{
                    title: title.length > 0,
                    tagCount: tagIds.length,
                    body: body.length > 0,
                    previewSeen,
                  }}
                />
                <div className="h-4" />
                <PublishingInfoCard />
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky footer actions ───────────────────────────── */}
      <footer
        className={cn(
          'sticky bottom-0 flex items-center justify-between gap-3',
          'border-t border-border-strong bg-card-bg px-6 py-4 md:px-8',
        )}
      >
        <p className="text-[12.5px] leading-[1.6] text-text-muted">
          15-minute edit window after publishing. Drafts are not yet persisted
          server-side.
        </p>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" disabled>
            Save as Draft
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Publishing…' : 'Publish post'}
          </Button>
        </div>
      </footer>
    </form>
  );
}
