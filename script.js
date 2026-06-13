// Cache player UI elements once to avoid repeated DOM lookups.
const playButton = document.querySelector(".play-btn");
const audio = document.querySelector(".player-audio");
const backgroundVideo = document.querySelector("#background-video");
const progressBar = document.querySelector(".progress-bar");
const progressFill = document.querySelector(".progress-fill");
const currentTimeEl = document.querySelector(".current-time");
const totalTimeEl = document.querySelector(".total-time");
const volumeSlider = document.querySelector(".volume-slider");
const volumeValue = document.querySelector(".volume-value");

// Convert seconds to mm:ss for the timeline labels.
const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

if (playButton && audio) {
    // Start unmuted at full volume.
    // Start unmuted at 30% volume.
    audio.muted = false;
    audio.volume = 0.3;

    // Toggle play/pause from the custom center button.
    playButton.addEventListener("click", async () => {
        try {
            if (audio.paused) {
                await audio.play();
            } else {
                audio.pause();
            }
        } catch (error) {
            console.error("Unable to start audio playback.", error);
        }
    });

    // Keep the button (icon/state) in sync with playback state.
    audio.addEventListener("play", () => {
        playButton.classList.add("is-playing");
        playButton.innerHTML = "&#10074;&#10074;";
        playButton.setAttribute("aria-label", "Pause");
        backgroundVideo.play();
    });

    audio.addEventListener("pause", () => {
        playButton.classList.remove("is-playing");
        playButton.innerHTML = "&#9658;";
        playButton.setAttribute("aria-label", "Play");
        backgroundVideo.pause();
    });

    // Populate duration when metadata is ready.
    audio.addEventListener("loadedmetadata", () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    // Some browsers provide accurate duration at canplay/durationchange.
    audio.addEventListener("canplay", () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    audio.addEventListener("durationchange", () => {
        totalTimeEl.textContent = formatTime(audio.duration);
    });

    // Update elapsed time and progress bar while audio is playing.
    audio.addEventListener("timeupdate", () => {
        currentTimeEl.textContent = formatTime(audio.currentTime);
        if (audio.duration) {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${progress}%`;
            progressBar?.setAttribute("aria-valuenow", `${Math.round(progress)}`);
        }
    });

    // Reset UI when the track finishes.
    audio.addEventListener("ended", () => {
        audio.currentTime = 0;
        progressFill.style.width = "0%";
        currentTimeEl.textContent = "00:00";
    });

    audio.addEventListener("error", () => {
        console.error("Audio file could not be loaded. Check the Music folder path.");
    });
}

if (volumeSlider && volumeValue && audio) {
    // Reflect the current volume in both slider and text.
    const updateVolumeUI = (volume) => {
        const percent = Math.round(volume * 100);
        volumeSlider.value = `${percent}`;
        volumeValue.textContent = `${percent}%`;
    };

    updateVolumeUI(audio.volume);

    // Apply volume changes live as the slider moves.
    volumeSlider.addEventListener("input", (event) => {
        const percent = Number(event.target.value);
        audio.volume = percent / 100;
        audio.muted = audio.volume === 0;
        updateVolumeUI(audio.volume);
    });
}

if (progressBar && audio) {
    // Seek to a new playback position when clicking the progress bar.
    progressBar.addEventListener("click", (event) => {
        if (!audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const percent = Math.min(Math.max(clickX / rect.width, 0), 1);
        audio.currentTime = percent * audio.duration;
        if (backgroundVideo.duration && isFinite(backgroundVideo.duration)) {
            backgroundVideo.currentTime = audio.currentTime % backgroundVideo.duration;
        }
    });
}

// Handle tab visibility changes to resume video if audio is playing
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && backgroundVideo && audio) {
        if (!audio.paused) {
            backgroundVideo.play().catch(error => console.error("Unable to resume video playback.", error));
            // Resync video time after returning to tab
            if (backgroundVideo.duration && isFinite(backgroundVideo.duration)) {
                backgroundVideo.currentTime = audio.currentTime % backgroundVideo.duration;
            }
        }
    }
});

// Toggle play/pause with the spacebar (ignore when typing in inputs)
document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' || event.key === ' ') {
        const active = document.activeElement;
        const tag = active && active.tagName;
        // Ignore when focus is in input-like elements or editable regions
        if (active && (active.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')) return;
        if (!audio) return;
        event.preventDefault();
        try {
            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
        } catch (err) {
            console.error('Unable to toggle audio playback via keyboard.', err);
        }
    }
});
