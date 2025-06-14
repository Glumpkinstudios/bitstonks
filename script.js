/**
 * @description Audio element for TTS playback.
 * @type {HTMLAudioElement}
 */
const audio = document.getElementById("audio");

/**
 * @description Source element for the audio playback.
 * @type {HTMLSourceElement}
 */
const audioSource = document.getElementById("audio-source");

const volume = Number.parseInt("{volume}") / 100;
const token = "{token}";
const voice = "{voice}";
const upInterval = Number.parseInt("{upInterval}") * 1000;
const minPrice = Number.parseInt("{minPrice}");
const maxPrice = Number.parseInt("{maxPrice}");
const downValue = Number.parseInt("{downValue}");
const downValueTrigger = Number.parseInt("{downValueTrigger}");
const upValue = Number.parseInt("{upValue}");
const startPrice = Number.parseInt("{startPrice}");

let bitPrice = Number.POSITIVE_INFINITY;

function setBitPrice(newPrice) {
  bitPrice = newPrice;
  document.getElementById("tts-price").innerText = newPrice.toString();
  // SE_API.store.set('bitstonks_bit_price', newPrice);
}

function preProcessText(text) {
  // Remove any leading or trailing whitespace
  text = text.trim();

  // Replace newlines with spaces
  text = text.replace(/\n/g, " ");

  // Remove any extra spaces
  text = text.replace(/\s+/g, " ");

  // Limit the text to 200 characters
  if (text.length > 200) {
    text = text.slice(0, 200);
    // remove the last word as it might be cut off
    const lastSpaceIndex = text.lastIndexOf(" ");
    if (lastSpaceIndex !== -1) {
      text = text.slice(0, lastSpaceIndex);
    }
  }

  return text;
}

async function playTts(text) {
  console.log("playTts called with text:", text);
  try {
    const processedText = preProcessText(text);
    const sanitizedText = await SE_API.sanitize({
      message: (await SE_API.cheerFilter(processedText)).trim(),
    });

    console.log(sanitizedText);

    if (sanitizedText.skip === true) {
      return;
    }

    const params = new URLSearchParams({
      voice,
      text: sanitizedText.result.message,
    });

    let speak = await fetch(
      `https://api.streamelements.com/kappa/v2/speech?${params.toString()}`,
      {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
        },
      }
    );

    if (!speak.ok) {
      console.error("Error from API:", speak.status, speak.statusText);
      return;
    }

    let mp3 = await speak.blob();

    // Convert the Blob to a Base64 data URL
    const base64Data = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(mp3);
    });

    audioSource.setAttribute("src", base64Data);

    audio.pause();
    audio.load();
    audio.volume = volume;
    audio.play();
  } catch (error) {
    console.error(
      "Error fetching or playing TTS:",
      error instanceof Error ? error.message : error
    );
  }
}

window.addEventListener("onEventReceived", function (obj) {
  if (!obj.detail.event) {
    return;
  }

  const listener = obj.detail.listener.split("-")[0];
  const event = obj.detail.event;
  console.log(listener, event, listener === "cheer", event.amount >= bitPrice);

  if (listener !== "cheer") {
    return;
  }

  if (event.amount >= downValueTrigger) {
    setBitPrice(Math.max(minPrice, bitPrice - downValue));
  }

  if (event.amount >= bitPrice) {
    playTts(event.message);
  }
});

window.addEventListener("onWidgetLoad", function (obj) {
  // SE_API.store.get('bitstonks_bit_price').then(val => {
  //   console.log('got val:', val)
  //   bitPrice = val;
  // })
  setBitPrice(startPrice);
});

setInterval(() => {
  setBitPrice(bitPrice + upValue);
}, upInterval);
