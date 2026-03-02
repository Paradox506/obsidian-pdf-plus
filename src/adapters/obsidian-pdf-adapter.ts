import { PDFDocumentProxy } from 'pdfjs-dist';
import { AnnotationElement, ObsidianViewer, PDFPageView, PDFViewer, PDFViewerChild } from 'typings';

/**
 * Adapter layer for Obsidian-specific PDF internals.
 *
 * Keep accesses to private or unstable host internals centralized here
 * so upgrades can be handled in one place.
 */
export class ObsidianPdfAdapter {
  getPdfViewer(child: PDFViewerChild): PDFViewer | null {
    return child.pdfViewer?.pdfViewer ?? null;
  }

  getPdfDocument(child: PDFViewerChild): PDFDocumentProxy | null {
    return this.getPdfViewer(child)?.pdfDocument ?? null;
  }

  getCurrentPageNumber(child: PDFViewerChild): number | null {
    return this.getPdfViewer(child)?.currentPageNumber ?? null;
  }

  getPageViews(viewer: ObsidianViewer): PDFPageView[] {
    const pages = viewer.pdfViewer?._pages;
    return Array.isArray(pages) ? pages : [];
  }

  getPageDivWithOffset(pdfViewer: PDFViewer, offset = 0): HTMLDivElement | null {
    return pdfViewer._pages[pdfViewer.currentPageNumber - 1 + offset]?.div ?? null;
  }

  getLocation(pdfViewer: PDFViewer | null): { pageNumber?: number; left?: number; top?: number; scale?: number } | null {
    const location = pdfViewer?._location;
    if (!location) return null;
    return {
      pageNumber: location.pageNumber,
      left: location.left,
      top: location.top,
      scale: location.scale,
    };
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

  getAnnotationElements(pageView: PDFPageView): HTMLElement[] {
    return Array.from(pageView.annotationLayer?.div?.querySelectorAll<HTMLElement>('section[data-annotation-id]') ?? []);
  }

  getAnnotation(pageView: PDFPageView, annotationId: string): AnnotationElement | null {
    return pageView.annotationLayer?.annotationLayer.getAnnotation(annotationId) ?? null;
  }

  getAnnotationElement(pageView: PDFPageView, annotationId: string): HTMLElement | null {
    return pageView.annotationLayer?.div.querySelector<HTMLElement>(`[data-annotation-id="${annotationId}"]`) ?? null;
  }

  getThumbnailContainer(child: PDFViewerChild): HTMLElement | null {
    return child.pdfViewer.pdfThumbnailViewer?.container ?? null;
  }

  scrollIntoView(target: HTMLElement, top = 0, scrollMatching = true) {
    if (window.pdfjsViewer?.scrollIntoView) {
      window.pdfjsViewer.scrollIntoView(target, { top }, scrollMatching);
    }
  }

  getScaleBounds(): { min: number; max: number } {
    const min = window.pdfjsViewer?.MIN_SCALE ?? 0.1;
    const max = window.pdfjsViewer?.MAX_SCALE ?? 10;
    return { min, max };
  }
}
