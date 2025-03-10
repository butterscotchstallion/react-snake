import {RefObject, useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Button} from "primereact/button";
import {Card} from "primereact/card";
import {Toast} from "primereact/toast";
import {Checkbox} from "primereact/checkbox";
import {ColorPicker, ColorPickerChangeEvent} from "primereact/colorpicker";
import {InputText} from "primereact/inputtext";
import {Slider} from "primereact/slider";
import {GameSettings, getSettings, setSettings} from "../settings.ts";
import 'primeicons/primeicons.css';
import SoundPlayer from "../soundPlayer.ts";

interface SnakeBlockProps {
    x: number;
    y: number;
}

export default function Game() {
    const soundPlayer: SoundPlayer = useMemo(() => {
        return new SoundPlayer();
    }, []);
    const DEFAULT_SNAKE_SIZE: number = 6;
    const DEFAULT_GAME_SPEED: number = 80;
    const WALL_DEATH_MSG = "You collided with a wall and experienced an unscheduled rapid disassembly.";
    const SELF_COLLISION_DEATH_MSG = "You tried to eat yourself.";
    const toast: RefObject<Toast | null> = useRef(null);
    const defaultSnake: SnakeBlockProps[] = getDefaultSnake();
    const gameBoardEl: RefObject<null> = useRef(null);
    const moveInterval: RefObject<number | null> = useRef(null);
    const [snake, setSnake] = useState<SnakeBlockProps[]>(defaultSnake);
    const [direction, setDirection] = useState("ArrowRight");
    const [gameSpeed, setGameSpeed] = useState(DEFAULT_GAME_SPEED);
    const [isGameOver, setIsGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(true);
    const [score, setScore] = useState(0);
    const [width] = useState(49);
    const [height] = useState(49);
    const getRndPosition = useCallback(() => {
        // Game board is a square so we can multiply by width or height here
        return Math.floor(Math.random() * height);
    }, [height]);
    const [food, setFood] = useState({x: getRndPosition(), y: getRndPosition()});
    const [gameOverReason, setGameOverReason] = useState(WALL_DEATH_MSG);
    const [highScore, setHighScore] = useState<number>(0);
    const [applesIncreaseSpeed, setApplesIncreaseSpeed] = useState(false);
    const [snakeColor, setSnakeColor] = useState("7CFF7F");
    const [appleColor, setAppleColor] = useState("98cc31");
    const [soundsEnabled, setSoundsEnabled] = useState(true);
    const [showDebuggingInfo, setShowDebuggingInfo] = useState(false);

    /*useLayoutEffect(() => {
        setWidth(gameBoardEl.current.clientWidth);
        setHeight(gameBoardEl.current.clientHeight);
    }, []);*/

    function initializeSettings() {
        const settings: GameSettings = getSettings();
        setSnakeColor(settings.snakeColor);
        setAppleColor(settings.appleColor);
        setApplesIncreaseSpeed(settings.applesIncreaseSpeed);
        setShowDebuggingInfo(settings.showDebuggingInfo);
        setSoundsEnabled(settings.soundsEnabled);
    }

    useEffect(() => {
        soundPlayer.initialize();
        initializeSettings();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
                setDirection(event.key);
            }

            if (event.code === "Space") {
                setIsPaused(!isPaused);
            }
        }
        window.addEventListener('keydown', handleKeyDown);

        initializeScoreStorage();

        setHighScore(getHighScoreFromStorage());

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPaused, soundPlayer]);

    useEffect(() => {
        function save() {
            const settings: GameSettings = {
                applesIncreaseSpeed,
                appleColor,
                snakeColor,
                soundsEnabled,
                showDebuggingInfo,
            };
            setSettings(settings);
        }

        save();
        console.log("Saved settings");
    }, [soundsEnabled, applesIncreaseSpeed, gameSpeed, snakeColor, appleColor, showDebuggingInfo]);

    useEffect(() => {
        function isSnakeHeadIntersectingWithSnakeSegment(x: number, y: number): boolean {
            let collision = false;
            snake.forEach((segment: SnakeBlockProps) => {
                if (segment.x === x && segment.y === y) {
                    collision = true;
                }
            });
            return collision;
        }

        function move() {
            const updatedSnake: SnakeBlockProps[] = [...snake];
            const snakeHead: SnakeBlockProps = updatedSnake[0];
            let newSnakeHead;

            switch (direction) {
                case 'ArrowUp':
                    newSnakeHead = {x: snakeHead.x, y: snakeHead.y - 1};
                    break;
                case 'ArrowDown':
                    newSnakeHead = {x: snakeHead.x, y: snakeHead.y + 1};
                    break;
                case 'ArrowLeft':
                    newSnakeHead = {x: snakeHead.x - 1, y: snakeHead.y};
                    break;
                case 'ArrowRight':
                    newSnakeHead = {x: snakeHead.x + 1, y: snakeHead.y};
                    break;
                default:
                    newSnakeHead = {x: snakeHead.x + 1, y: snakeHead.y};
                    break;
            }

            // Wall collision
            if (newSnakeHead.x < 0 || newSnakeHead.x > width || newSnakeHead.y < 0 || newSnakeHead.y > height) {
                if (soundsEnabled) {
                    soundPlayer.playGameOverSound();
                }
                setGameOverReason(WALL_DEATH_MSG);
                setIsGameOver(true);
                return;
            }

            // Self collision
            const selfCollision: boolean = isSnakeHeadIntersectingWithSnakeSegment(newSnakeHead.x, newSnakeHead.y);
            if (selfCollision) {
                if (soundsEnabled) {
                    soundPlayer.playGameOverSound();
                }
                setGameOverReason(SELF_COLLISION_DEATH_MSG);
                setIsGameOver(true);
                return;
            }

            updatedSnake.unshift(newSnakeHead);

            const appleEaten: boolean = snakeHead.x === food.x && snakeHead.y === food.y;
            if (appleEaten) {
                if (soundsEnabled) {
                    soundPlayer.playAppleSound();
                }

                if (applesIncreaseSpeed && gameSpeed >= 1) {
                    setGameSpeed(gameSpeed - 5);
                }

                const newScore: number = score + 1;
                const highScore: string | null = localStorage.getItem("highScore");
                if (highScore && newScore > parseInt(highScore, 10)) {
                    localStorage.setItem("highScore", newScore.toString());
                    onNewHighScore(newScore);
                }

                setScore(newScore);
                setFood({x: getRndPosition(), y: getRndPosition()});
            } else {
                updatedSnake.pop();
            }

            setSnake(updatedSnake);
        }

        moveInterval.current = setInterval(() => {
            if (!isGameOver && !isPaused) {
                move();
            }
        }, gameSpeed);
        return () => stopMoveInterval();
    }, [direction, snake, gameSpeed, food.x, food.y, score, width, height, getRndPosition,
        isPaused, isGameOver, applesIncreaseSpeed, soundPlayer, soundsEnabled]);
    
    function onNewHighScore(newHighScore: number) {
        setHighScore(newHighScore);
        if (toast.current) {
            toast.current.show({
                severity: 'success',
                summary: 'New High Score!',
                detail: `Your new high score is ${newHighScore}!`
            });
        }
    }

    function stopMoveInterval() {
        if (moveInterval.current) {
            clearInterval(moveInterval.current);
        }
    }

    function reset() {
        setIsGameOver(false);
        setSnake(defaultSnake);
        setFood({x: getRndPosition(), y: getRndPosition()});
        setScore(0);
        if (applesIncreaseSpeed) {
            setGameSpeed(DEFAULT_GAME_SPEED);
        }
    }

    function initializeScoreStorage() {
        if (localStorage.getItem("highScore") === null) {
            localStorage.setItem("highScore", "0");
        }
    }

    function getHighScoreFromStorage(): number {
        const highScore: string | null = localStorage.getItem("highScore");
        if (highScore) {
            return parseInt(highScore, 10);
        }
        return 0;
    }

    function getDefaultSnake(): SnakeBlockProps[] {
        const snake: SnakeBlockProps[] = [];
        const x: number = 20;
        const y: number = 20;
        for (let j = 0; j < DEFAULT_SNAKE_SIZE; j++) {
            snake.push({
                x: x,
                y: y
            });
        }
        return snake;
    }

    function resetHighScore() {
        setHighScore(0);
        localStorage.setItem("highScore", "0");
        if (toast.current) {
            toast.current.show({
                severity: 'success',
                summary: 'High Score Reset!',
                detail: `Your new high score is 0!`
            });
        }
    }

    return (
        <>
            <div className="mx-auto mt-4 w-[800px] h-[500px]">
                {isGameOver ?
                    <Card title="Game Over!" className="mb-4">
                        <p className="m-0 mb-5">{gameOverReason}</p>
                        <p className="m-0">
                            <Button label="Play Again" onClick={reset}/>
                        </p>
                    </Card>
                    : ""}
                <div className="flex gap-4">
                    <aside>
                        <Card title="Info" className="mb-2">
                            <ul>
                                <li>Score: {score}</li>
                                <li>High Score: {highScore}</li>
                                {showDebuggingInfo ?
                                    <li className="text-gray-400">
                                        Position: {[snake[0].x, snake[0].y].join(', ')}
                                    </li> : ''}
                            </ul>
                        </Card>
                        <Card title="Settings">
                            <ul>
                                <li className="mb-4">
                                    <Checkbox
                                        inputId="soundsEnabled"
                                        onChange={e => setSoundsEnabled(!!e.checked)}
                                        checked={soundsEnabled}></Checkbox>
                                    <label htmlFor="soundsEnabled" className="ml-2">Enable Sounds</label>
                                </li>
                                <li className="mb-4">
                                    <Checkbox
                                        inputId="applesIncreaseSpeed"
                                        onChange={e => setApplesIncreaseSpeed(!!e.checked)}
                                        checked={applesIncreaseSpeed}></Checkbox>
                                    <label htmlFor="applesIncreaseSpeed" className="ml-2">Apples Increase Speed</label>
                                </li>
                                <li className="mb-4">
                                    <label htmlFor="gameSpeed" className="mb-2 block">Game Speed</label>
                                    <InputText value={gameSpeed.toString()}
                                               className="w-[75px] mb-2"
                                               readOnly={true}
                                               onChange={(e) => {
                                                   setGameSpeed(parseInt(e.target.value, 10))
                                               }}/>
                                    <Slider value={gameSpeed}
                                            className="mt-4"
                                            min={1}
                                            max={80}
                                            onChange={(e) => {
                                                setGameSpeed(parseInt(e.value.toString(), 10))
                                            }}/>
                                </li>
                                <li className="mb-4">
                                    <ColorPicker inputId="snakeColor"
                                                 value={snakeColor}
                                                 onChange={(e: ColorPickerChangeEvent) => setSnakeColor(e.value)}/>
                                    <label htmlFor="snakeColor" className="ml-2">Snake Color</label>
                                </li>
                                <li className="mb-4">
                                    <ColorPicker inputId="appleColor"
                                                 value={appleColor}
                                                 onChange={(e: ColorPickerChangeEvent) => setAppleColor(e.value)}/>
                                    <label htmlFor="appleColor" className="ml-2">Apple Color</label>
                                </li>
                                <li className="mb-4">
                                    <Checkbox
                                        inputId="showDebuggingInfo"
                                        onChange={e => setShowDebuggingInfo(!!e.checked)}
                                        checked={showDebuggingInfo}></Checkbox>
                                    <label htmlFor="showDebuggingInfo" className="ml-2">Show Debugging Info</label>
                                </li>
                                <li className="mb-4">
                                    <Button label="Reset High Score" onClick={resetHighScore}/>
                                </li>
                            </ul>
                        </Card>
                    </aside>
                    <section>
                        <div
                            ref={gameBoardEl}
                            onClick={() => {
                                setIsPaused(!isPaused);
                            }}
                            className="flex relative cursor-pointer w-[500px] h-[500px] bg-indigo-950 border-1 border-indigo-500">

                            {snake.map((segment: SnakeBlockProps, index: number) => (
                                <div key={index}
                                     className="w-[10px] h-[10px] absolute"
                                     style={{
                                         backgroundColor: `#${snakeColor}`,
                                         left: segment.x * 10,
                                         top: segment.y * 10
                                     }}></div>
                            ))}

                            {/*
                            <i className="block pi pi-apple food absolute w-[16px] h-[16px]"
                               style={{
                                   color: `#${appleColor}`,
                                   left: food.x * 10,
                                   top: food.y * 10
                               }}></i>*/}
                            <div className="block absolute w-[10px] h-[10px]"
                                 style={{
                                     backgroundColor: `#${appleColor}`,
                                     left: food.x * 10,
                                     top: food.y * 10
                                 }}></div>

                            {isPaused ?
                                <div className="flex mx-auto items-center text-yellow-400 text-[64px] animate-pulse">
                                    PAUSED
                                </div>
                                : ''}
                        </div>
                    </section>
                </div>
            </div>

            <Toast ref={toast}/>
        </>
    )
}