import Vec2 from 'victor';
import { Game } from "./game";

export default class MouseHandler {
  game: Game;
  pos: Vec2;
  steering: boolean;
  
  constructor(game: Game) {
    this.game = game;
    this.steering = false;
    this.pos = Vec2(0,0);
  }
  
  registerMouseListener() {
    const onMouseUpdate =(e: MouseEvent) => {
      this.pos.x = (e.clientX - window.innerWidth / 2) / this.game.drawScale;
      this.pos.y = (e.clientY - window.innerHeight / 2) / this.game.drawScale;
    };
  
    const onMouseDown = () => {
      this.steering = true;
    }
  
    const onMouseUp = () => {
      this.steering = false;
    }
    
    document.addEventListener("mousemove", onMouseUpdate, false);
    document.addEventListener("mousedown", onMouseDown, false);
    document.addEventListener("mouseup", onMouseUp, false);
  }
}