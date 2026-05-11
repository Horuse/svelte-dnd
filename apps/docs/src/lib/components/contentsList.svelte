<script lang="ts">
    import { onMount } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';

    interface TocItem {
        id: string;
        text: string;
        level: number;
    }

    type IndicatorRange = { startId: string; endId: string };
    type PathPoint = { x: number; y: number };

    let {
        contentSelector = '.prose',
        scrollSelector = 'main',
    }: {
        contentSelector?: string;
        scrollSelector?: string;
    } = $props();

    let headings = $state<TocItem[]>([]);
    let activeIds = $state(new Set<string>());

    // Line animation state
    let indicatorTop = $state(0);
    let indicatorHeight = $state(0);
    let indicatorBottom = $state(0);
    let lineHeight = $state(0);
    let svgPath = $state('');
    let svgWidth = $state(40);
    let indicatorRange = $state<IndicatorRange | null>(null);
    let linksWrapper = $state<HTMLElement | null>(null);
    let pendingIndicatorFrame: number | null = null;

    const linkRefs = new SvelteMap<string, HTMLElement>();
    const linkPositions = new SvelteMap<string, { top: number; height: number }>();
    const headingOrder = new SvelteMap<string, number>();

    const CORNER_RADIUS = 2;
    const INDENT_STEP = 12;

    // --- registerLink action ---
    function registerLink(node: HTMLElement, id?: string) {
        let currentId = id ?? '';
        if (currentId) linkRefs.set(currentId, node);

        return {
            update(newId?: string) {
                if (newId === currentId) return;
                if (currentId) { linkRefs.delete(currentId); linkPositions.delete(currentId); }
                currentId = newId ?? '';
                if (currentId) linkRefs.set(currentId, node);
            },
            destroy() {
                if (currentId) { linkRefs.delete(currentId); linkPositions.delete(currentId); }
            },
        };
    }

    // --- SVG path builder ---
    function buildRoundedPath(points: PathPoint[], radius: number): string {
        if (points.length === 0) return '';
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

        const commands: string[] = [`M ${points[0].x} ${points[0].y}`];

        for (let i = 1; i < points.length; i++) {
            const point = points[i];
            const prev = points[i - 1];

            if (i === points.length - 1) { commands.push(` L ${point.x} ${point.y}`); continue; }

            const next = points[i + 1];
            const prevVecX = point.x - prev.x, prevVecY = point.y - prev.y;
            const nextVecX = next.x - point.x, nextVecY = next.y - point.y;
            const prevLen = Math.hypot(prevVecX, prevVecY);
            const nextLen = Math.hypot(nextVecX, nextVecY);

            if (prevLen === 0 || nextLen === 0) { commands.push(` L ${point.x} ${point.y}`); continue; }

            const prevDirX = prevVecX / prevLen, prevDirY = prevVecY / prevLen;
            const nextDirX = nextVecX / nextLen, nextDirY = nextVecY / nextLen;
            const dot = prevDirX * nextDirX + prevDirY * nextDirY;

            if (Math.abs(dot) > 0.999) { commands.push(` L ${point.x} ${point.y}`); continue; }

            const cr = Math.min(radius, prevLen / 2, nextLen / 2);
            commands.push(` L ${point.x - prevDirX * cr} ${point.y - prevDirY * cr}`);
            commands.push(` Q ${point.x} ${point.y} ${point.x + nextDirX * cr} ${point.y + nextDirY * cr}`);
        }

        return commands.join('');
    }

    // --- Layout: measure link positions and build SVG path ---
    function updateLayout() {
        if (!linksWrapper || headings.length === 0) { lineHeight = 0; return; }

        linkPositions.clear();
        const polyline: PathPoint[] = [];
        let maxW = 0;
        const halfStroke = 0.5;
        const minLevel = Math.min(...headings.map((h) => h.level));

        for (const heading of headings) {
            const node = linkRefs.get(heading.id);
            if (!node) continue;

            const style = window.getComputedStyle(node);
            const pt = parseFloat(style.paddingTop) || 0;
            const pb = parseFloat(style.paddingBottom) || 0;
            const posTop = node.offsetTop + pt;
            const posBottom = node.offsetTop + node.offsetHeight - pb;
            const posHeight = Math.max(0, posBottom - posTop);

            linkPositions.set(heading.id, { top: posTop, height: posHeight });

            const x = (heading.level - minLevel) * INDENT_STEP + halfStroke;
            const bottom = Math.max(posTop, posBottom);

            // If x changed — add horizontal step at the midpoint between headings
            if (polyline.length > 0) {
                const prev = polyline[polyline.length - 1];
                if (prev.x !== x) {
                    const midY = (prev.y + posTop) / 2;
                    polyline.push({ x: prev.x, y: midY });
                    polyline.push({ x, y: midY });
                }
            }

            polyline.push({ x, y: posTop });
            polyline.push({ x, y: bottom });
            maxW = Math.max(maxW, x + halfStroke);
        }

        svgPath = buildRoundedPath(polyline, CORNER_RADIUS);
        svgWidth = Math.max(40, maxW + 10);
        lineHeight = linksWrapper.scrollHeight;
    }

    // --- Indicator position ---
    function updateIndicator(range?: IndicatorRange) {
        const sortedActive = [...activeIds].sort((a, b) => (headingOrder.get(a) ?? 0) - (headingOrder.get(b) ?? 0));
        const fallback = sortedActive.length > 0 ? { startId: sortedActive[0], endId: sortedActive[sortedActive.length - 1] } : null;
        const applied = range ?? indicatorRange ?? fallback;

        if (!applied) {
            indicatorRange = null;
            indicatorTop = indicatorHeight = indicatorBottom = 0;
            return;
        }

        if (range) indicatorRange = range;
        else if (!indicatorRange) indicatorRange = applied;

        const startPos = linkPositions.get(applied.startId);
        const endPos = linkPositions.get(applied.endId);

        if (!startPos || !endPos) {
            indicatorTop = indicatorHeight = indicatorBottom = 0;
            return;
        }

        const top = Math.min(startPos.top, endPos.top);
        const bottom = Math.max(startPos.top + startPos.height, endPos.top + endPos.height);
        indicatorTop = top;
        indicatorHeight = Math.max(0, bottom - top);
        indicatorBottom = bottom;
    }

    function scheduleIndicatorUpdate(range?: IndicatorRange | null) {
        if (pendingIndicatorFrame !== null) window.cancelAnimationFrame(pendingIndicatorFrame);
        pendingIndicatorFrame = window.requestAnimationFrame(() => {
            pendingIndicatorFrame = null;
            range ? updateIndicator(range) : updateIndicator();
        });
    }

    // --- Mount: your original scroll/intersection logic ---
    onMount(() => {
        const contentEl = document.querySelector(contentSelector);
        const scrollEl = document.querySelector(scrollSelector);
        if (!contentEl || !scrollEl) return;

        extractHeadings(contentEl);

        const visibleHeadings = new Map<string, number>();
        let intersectionObs: IntersectionObserver | null = null;

        const mutationObs = new MutationObserver(() => {
            extractHeadings(contentEl);
            setupIntersectionObserver();
        });
        mutationObs.observe(contentEl, { childList: true, subtree: true });

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
                { root: scrollEl, rootMargin: '-80px 0px 0px 0px' },
            );

            for (const h of headings) {
                const el = document.getElementById(h.id);
                if (el) intersectionObs.observe(el);
            }
        }

        function updateActive() {
            const distToBottom = scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

            if (distToBottom < 100 && headings.length > 0) {
                const lastId = headings[headings.length - 1].id;
                activeIds = new Set([lastId]);
                scheduleIndicatorUpdate({ startId: lastId, endId: lastId });
                return;
            }

            if (visibleHeadings.size > 0) {
                const sorted = [...visibleHeadings.keys()].sort(
                    (a, b) => (headingOrder.get(a) ?? 0) - (headingOrder.get(b) ?? 0),
                );
                activeIds = new Set(sorted);
                scheduleIndicatorUpdate({ startId: sorted[0], endId: sorted[sorted.length - 1] });
                return;
            }

            // Fallback: last heading past the top
            const scrollRect = scrollEl.getBoundingClientRect();
            const threshold = scrollRect.top + 100;
            let lastPassed = headings[0]?.id ?? '';

            for (const h of headings) {
                const el = document.getElementById(h.id);
                if (!el) continue;
                if (el.getBoundingClientRect().top <= threshold) lastPassed = h.id;
                else break;
            }

            activeIds = new Set(lastPassed ? [lastPassed] : []);
            if (lastPassed) scheduleIndicatorUpdate({ startId: lastPassed, endId: lastPassed });
        }

        scrollEl.addEventListener('scroll', updateActive, { passive: true });

        const resizeObs = new ResizeObserver(() => {
            updateLayout();
            updateIndicator();
        });

        setupIntersectionObserver();
        setTimeout(() => {
            updateLayout();
            updateActive();
            if (linksWrapper) resizeObs.observe(linksWrapper);
        }, 100);

        return () => {
            mutationObs.disconnect();
            intersectionObs?.disconnect();
            scrollEl.removeEventListener('scroll', updateActive);
            resizeObs.disconnect();
            if (pendingIndicatorFrame !== null) window.cancelAnimationFrame(pendingIndicatorFrame);
        };
    });

    function extractHeadings(container: Element) {
        const els = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const items: TocItem[] = [];
        const seenIds = new Map<string, number>();

        els.forEach((el, i) => {
            if (!el.id) el.id = slugify(el.textContent || '') || `heading-${i}`;
            const base = el.id;
            const count = seenIds.get(base) ?? 0;
            if (count > 0) el.id = `${base}-${count}`;
            seenIds.set(base, count + 1);
            items.push({ id: el.id, text: el.textContent?.trim() || '', level: parseInt(el.tagName[1]) });
        });

        headings = items;
        headingOrder.clear();
        items.forEach(({ id }, index) => headingOrder.set(id, index));
        requestAnimationFrame(() => updateLayout());
    }

    function slugify(text: string): string {
        return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
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

    function indentPadding(level: number): string {
        const min = Math.min(...headings.map((h) => h.level));
        return `${(level - min) * INDENT_STEP}px`;
    }

    function levelColor(level: number): string {
        const levels = headings.map((h) => h.level);
        const min = Math.min(...levels);
        const max = Math.max(...levels);
        const range = Math.max(1, max - min);
        const t = (level - min) / range;
        const opacity = (1 - t * 0.65).toFixed(2); // h1=1.0, h6≈0.35
        return `color-mix(in srgb, var(--color-theme) calc(${opacity} * 100%), transparent)`;
    }

    // SVG mask URL (encoded)
    const svgMask = $derived(
        `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${svgWidth} ${lineHeight}' width='${svgWidth}' height='${lineHeight}' preserveAspectRatio='none'%3E%3Cpath d='${svgPath}' stroke='black' stroke-width='1' fill='none'/%3E%3C/svg%3E")`
    );
</script>

<nav class="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-4" aria-label="Table of Contents">
    <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">On this page</p>

    <div class="relative flex px-2">
        <!-- Animated SVG-masked line -->
        <div
            class="pointer-events-none absolute top-0 left-1 h-full w-10"
            style:mask-image={svgMask}
            style:-webkit-mask-image={svgMask}
            style:mask-repeat="no-repeat"
            style:-webkit-mask-repeat="no-repeat"
            style:mask-position="left top"
            style:-webkit-mask-position="left top"
            style:mask-size="100% 100%"
            style:-webkit-mask-size="100% 100%"
        >
            <!-- Base line -->
            <div class="absolute inset-0 h-full w-full bg-third"></div>

            <!-- Active indicator -->
            {#if indicatorHeight > 0}
                <div
                    class="absolute left-0 w-full bg-indigo-400 transition-all duration-[450ms] ease-out"
                    style:top="{indicatorTop}px"
                    style:bottom="{Math.max(0, lineHeight - indicatorBottom)}px"
                ></div>
            {/if}
        </div>

        <ol class="relative flex flex-col pl-3 text-sm" bind:this={linksWrapper}>
            {#each headings as heading (heading.id)}
                <li style:padding-left={indentPadding(heading.level)}>
                    <button
                        class="block w-full cursor-pointer py-1 text-left text-[0.8125rem] leading-relaxed transition-colors duration-150
                            {activeIds.has(heading.id) ? 'text-indigo-400' : ''}"
                        style:color={activeIds.has(heading.id) ? undefined : levelColor(heading.level)}
                        onclick={() => scrollTo(heading.id)}
                        use:registerLink={heading.id}
                    >
                        {heading.text}
                    </button>
                </li>
            {/each}
        </ol>
    </div>
</nav>