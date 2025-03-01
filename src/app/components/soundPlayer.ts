import * as Tone from "tone";

class SoundPlayer {
    appleSoundPlayer: Tone.Player | undefined;
    gameOverSoundPlayer: Tone.Player | undefined;

    public initialize() {
        this.appleSoundPlayer = new Tone.Player(
            "/sounds/item-pick-up-38258.mp3"
        ).toDestination();
        this.gameOverSoundPlayer = new Tone.Player(
            "/sounds/game-over-arcade-6435.mp3"
        ).toDestination();
    }

    public playAppleSound() {
        this.appleSoundPlayer?.start();
    }
    
    public playGameOverSound() {
        this.gameOverSoundPlayer?.start();
    }
}

export default SoundPlayer;