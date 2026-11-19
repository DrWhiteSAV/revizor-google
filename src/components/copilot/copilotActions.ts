/**
 * Captures a screenshot of the user's active screen or window.
 * Uses navigator.mediaDevices.getDisplayMedia with a hidden video and canvas capture.
 */
export async function captureActiveScreen(): Promise<string> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Захват экрана не поддерживается данным браузером');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'browser'
    } as any,
    audio: false
  });

  const video = document.createElement('video');
  video.srcObject = stream;
  video.autoplay = true;

  return new Promise<string>((resolve, reject) => {
    video.onloadedmetadata = async () => {
      try {
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Не удалось создать 2D контекст для снимка');
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

        // Stop all media tracks to release screen sharing
        stream.getTracks().forEach((track) => track.stop());
        video.srcObject = null;

        resolve(dataUrl);
      } catch (err) {
        stream.getTracks().forEach((track) => track.stop());
        reject(err);
      }
    };

    video.onerror = (err) => {
      stream.getTracks().forEach((track) => track.stop());
      reject(err);
    };
  });
}

/**
 * Dispatches an event to auto-fill form fields across active modal or editor cards.
 */
export function dispatchCabinetFillForm(fields: Record<string, any>) {
  window.dispatchEvent(
    new CustomEvent('cabinet-copilot-fill', {
      detail: { fields }
    })
  );
}

/**
 * Dispatches an event to open a modal by name.
 */
export function dispatchCabinetOpenModal(modalName: string, payload?: any) {
  window.dispatchEvent(
    new CustomEvent('cabinet-copilot-open-modal', {
      detail: { modalName, payload }
    })
  );
}

/**
 * Dispatches an event to show or hide the visual AI processing overlay during autonomous cascade actions.
 */
export function dispatchCopilotOverlay(payload: {
  active: boolean;
  title?: string;
  phrase?: string;
  countdown?: number;
  mascot?: 'welcome' | 'bell' | 'serious' | 'happy' | 'success' | 'clock' | 'test' | 'sad';
}) {
  window.dispatchEvent(
    new CustomEvent('cabinet-copilot-overlay', {
      detail: payload
    })
  );
}
