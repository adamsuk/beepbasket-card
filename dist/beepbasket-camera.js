window.BeepBasketCamera = {
  async openScanner(card) {
    // 1. Load ZXing FIRST
    if (!window.ZXing) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@zxing/library@latest/umd/index.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // 2. Direct dialog
    const dialog = document.createElement("ha-dialog");
    dialog.hass = card._hass;
    dialog.heading = "📷 Camera Scanner";
    
    const content = document.createElement("div");
    content.style.cssText = "text-align: center; padding: 1em;";
    content.innerHTML = `
      <video id="scannerVideo" autoplay playsinline muted 
             style="width: 100%; max-width: 400px; border-radius: 8px; background: #000; display: block;"></video>
      <div id="scannerStatus" style="margin-top: 1em; font-size: 0.9em; color: var(--secondary-text-color);">
        Starting camera...
      </div>
    `;
    dialog.appendChild(content);

    document.body.appendChild(dialog);
    dialog.open = true;

    // 🚀 AUTO-START CAMERA IMMEDIATELY
    this._startCamera(card, dialog);
  },

  async _startCamera(card, dialog) {
    const video = dialog.querySelector("#scannerVideo");
    const status = dialog.querySelector("#scannerStatus");
    
    try {
      const codeReader = new ZXing.BrowserMultiFormatReader();
      
      codeReader.decodeFromVideoDevice(
        null, 
        video,
        (result, err) => {
          if (result) {
            console.log('✅ SCANNED:', result.text);
            status.textContent = `✅ Found: ${result.text}`;
            codeReader.reset();
            card._barcodeField.value = result.text;
            setTimeout(() => {
              card._addQuick();
              dialog.open = false;
            }, 500);
            BeepBasketUI.showToast(card, `📷 Scanned: ${result.text}`);
          }

          if (err) {
            const errName = err?.name || err?.constructor?.name || '';
            const errMsg = err?.message || '';
            if (!errName.includes('NotFound') && !errMsg.includes('non-ReaderException')) {
              console.warn('ZXing Camera Warning:', err);
            }
          }
        },
        {
          delayBetweenScanAttempts: 1000,
          tryHarder: true,
          videoConstraints: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          }
        }
      );
      
      status.textContent = "📷 Point barcode at camera";
      
      dialog.addEventListener('closed', () => {
        codeReader.reset();
        if (video.srcObject) {
          video.srcObject.getTracks().forEach(track => track.stop());
        }
        dialog.remove();
      }, { once: true });
      
    } catch (e) {
      status.textContent = "Camera failed";
      BeepBasketUI.showToast(card, "Camera error", true);
    }
  }
};