<script lang="ts">
    import { onMount } from 'svelte';

    interface TocItem {
        id: string;
        text: string;
        level: number;
    }

    let {
        contentSelector = '.prose',
        scrollSelector = 'main',
    }: {
        contentSelector?: string;
        scrollSelector?: string;
    } = $props();

    let headings = $state<TocItem[]>([]);
    let activeId = $state<string>('');

    onMount(() => {
        const contentEl = document.querySelector(contentSelector);
        const scrollEl = document.querySelector(scrollSelector);
        if (!contentEl || !scrollEl) return;

        extractHeadings(contentEl);

        const visibleHeadings = new Map<string, number>();
        let intersectionObs: IntersectionObserver | null = null;

        // --- Mutation observer for dynamic content ---
        const mutationObs = new MutationObserver(() => {
            extractHeadings(contentEl);
            setupIntersectionObserver();
        });
        mutationObs.observe(contentEl, { childList: true, subtree: true });

        // --- Intersection observer (uses scrollEl as root) ---
        function setupIntersectionObserver() {
            intersectionObs?.disconnect();
            visibleHeadings.clear();

            intersectionObs = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            visibleHeadings.set(entry.target.id, entry.boundingClientRect.top);
                        } else {
                            visibleHeadings.delete(entry.target.id);
                        }
                    }
                    updateActive();
                },
                {
                    root: scrollEl,
                    rootMargin: '-80px 0px -70% 0px',
                }
            );

            for (const h of headings) {
                const el = document.getElementById(h.id);
                if (el) intersectionObs.observe(el);
            }
        }

        // --- Pick active heading ---
        function updateActive() {

            // 1. Near bottom of scroll container → last heading
            const distToBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

            if (distToBottom < 100 && headings.length > 0) {
                activeId = headings[headings.length - 1].id;
                return;
            }

            // 2. From visible headings in intersection zone, pick topmost
            if (visibleHeadings.size > 0) {
                let bestId = '';
                let bestTop = Infinity;
                for (const [id, top] of visibleHeadings) {
                    if (top < bestTop) {
                        bestTop = top;
                        bestId = id;
                    }
                }
                if (bestId) {
                    activeId = bestId;
                    return;
                }
            }

            // 3. Fallback: last heading that scrolled past the top
            const scrollRect = scrollEl.getBoundingClientRect();
            const threshold = scrollRect.top + 100;
            let lastPassed = headings[0]?.id ?? '';

            for (const h of headings) {
                const el = document.getElementById(h.id);
                if (!el) continue;
                if (el.getBoundingClientRect().top <= threshold) {
                    lastPassed = h.id;
                } else {
                    break;
                }
            }
            activeId = lastPassed;
        }

        // --- Scroll listener on the actual scroll container ---
        scrollEl.addEventListener('scroll', updateActive, { passive: true });

        setupIntersectionObserver();
        setTimeout(updateActive, 100);

        return () => {
            mutationObs.disconnect();
            intersectionObs?.disconnect();
            scrollEl.removeEventListener('scroll', updateActive);
        };
    });

    function extractHeadings(container: Element) {
        const els = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const items: TocItem[] = [];
        const seenIds = new Map<string, number>();

        els.forEach((el, i) => {
            if (!el.id) {
                el.id = slugify(el.textContent || '') || `heading-${i}`;
            }

            // Deduplicate IDs (e.g. multiple "### Props" sections)
            const base = el.id;
            const count = seenIds.get(base) ?? 0;
            if (count > 0) {
                el.id = `${base}-${count}`;
            }
            seenIds.set(base, count + 1);

            items.push({
                id: el.id,
                text: el.textContent?.trim() || '',
                level: parseInt(el.tagName[1]),
            });
        });

        headings = items;
    }

    function slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    function scrollTo(id: string) {
        const el = document.getElementById(id);
        if (!el) return;

        const scrollEl = document.querySelector(scrollSelector);
        if (!scrollEl) return;

        const scrollRect = scrollEl.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offset = elRect.top - scrollRect.top + scrollEl.scrollTop - 80;

        scrollEl.scrollTo({ top: offset, behavior: 'smooth' });
    }

    function indentClass(level: number): string {
        const min = Math.min(...headings.map((h) => h.level));
        const depth = level - min;
        return ['pl-3', 'pl-6', 'pl-9', 'pl-12', 'pl-[3.75rem]'][depth] ?? 'pl-3';
    }
</script>

<nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4" aria-label="Table of Contents">
    <p class="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-3">On this page</p>
    <ul class="border-l-2 border-primary space-y-0.5">
        {#each headings as heading (heading.id)}
            <li>
                <button
                        class="block w-full text-left text-[0.8125rem] leading-relaxed -ml-0.5 border-l-2 transition-colors duration-150 cursor-pointer py-0.5
                        {indentClass(heading.level)}
                        {activeId === heading.id
                        ? 'text-indigo-400 border-indigo-400 font-medium'
                        : 'text-neutral-500 border-transparent hover:text-neutral-900 dark:hover:text-neutral-300'}"
                        onclick={() => scrollTo(heading.id)}
                >
                    {heading.text}
                </button>
            </li>
        {/each}
    </ul>
</nav>