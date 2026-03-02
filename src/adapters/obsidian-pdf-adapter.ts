import { ObsidianViewer, PDFPageView } from 'typings';

/**
 * Adapter layer for Obsidian-specific PDF internals.
 *
 * Keep accesses to private or unstable host internals centralized here
 * so upgrades can be handled in one place.
 */
export class ObsidianPdfAdapter {
  getPageViews(viewer: ObsidianViewer): PDFPageView[] {
    const pages = viewer.pdfViewer?._pages;
    return Array.isArray(pages) ? pages : [];
  }

  getCurrentLocation(viewer: ObsidianViewer): { left?: number; top?: number; scale?: number } | null {
    const location = viewer.pdfViewer?._location;
    if (!location) return null;
    return {
      left: location.left,
      top: location.top,
      scale: location.scale,
    };
  }

  getAnnotationElement(pageView: PDFPageView, annotationId: string): HTMLElement | null {
    return pageView.annotationLayer?.div.querySelector<HTMLElement>(`[data-annotation-id="${annotationId}"]`) ?? null;
  }
}
