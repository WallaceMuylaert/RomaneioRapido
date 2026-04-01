/**
 * Web Audio API based sound effects synthesizer.
 * Provides auditory feedback without needing external assets.
 */

class SoundEffects {
    private ctx: AudioContext | null = null;

    private getContext() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.ctx;
    }

    /**
     * Resumes the audio context if it was suspended (browser policy)
     */
    private async resume() {
        const ctx = this.getContext();
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        return ctx;
    }

    /**
     * Plays a short 'beep' for scanning success.
     */
    async playScan() {
        try {
            const ctx = await this.resume();
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5

            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            oscillator.connect(gain);
            gain.connect(ctx.destination);

            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.warn('Audio feedback failed:', e);
        }
    }

    /**
     * Plays a satisfying success chime.
     */
    async playSuccess() {
        try {
            const ctx = await this.resume();
            const now = ctx.currentTime;

            const playNote = (freq: number, start: number, duration: number, volume: number = 0.1) => {
                const osc = ctx.createOscillator();
                const g = ctx.createGain();

                osc.type = 'sine'; // Sine is softer and more "bonitinho"
                osc.frequency.setValueAtTime(freq, start);

                g.gain.setValueAtTime(0, start);
                g.gain.linearRampToValueAtTime(volume, start + 0.05);
                g.gain.exponentialRampToValueAtTime(0.01, start + duration);

                osc.connect(g);
                g.connect(ctx.destination);

                osc.start(start);
                osc.stop(start + duration);
            };

            // A satisfying major chord sequence
            playNote(523.25, now, 0.4);        // C5
            playNote(659.25, now + 0.1, 0.4);  // E5
            playNote(783.99, now + 0.2, 0.5);  // G5
            playNote(1046.50, now + 0.3, 0.6); // C6

        } catch (e) {
            console.warn('Audio feedback failed:', e);
        }
    }
}

export const soundEffects = new SoundEffects();
