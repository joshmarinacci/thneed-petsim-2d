/*

board should be a list of rects
walls and outer bounds. player must be inside outer bounds and not inside walls

board view draws the board rects
items view draws the items
pets view draws the pets
player view draws the player

if arrow keys
    calculate new position for player
    if new position inside outer bounds
        if new position not intersects walls
            move player to new position

items is a list of rects
if click on coin item
    set pets.target to coin


if pet.intersects(pet.target)
    if coin and
        go to eating state
        decrease coin
        increase score
        if !coin.alive
            delete coin
            pet.target = player
    if player
        go to sitting state
else
    diff = pet.bounds.center.subtract(pet.target.bounds.center).unit().scale(pet.run_speed)
    pet.bounds.add(diff)


if player intersects egg item
    show button to buy egg
    egg gives you random new pet
    egg uses up coins

score view shows
    current coin count
    current pet count
 */

import {
    BaseView,
    CanvasSurface,
    CoolEvent,
    LayerView, log,
    Point,
    POINTER_DOWN, PointerEvent,
    randi,
    Rect,
    Size,
    SurfaceContext
} from "thneed-gfx";
import {GridModel, KeyboardMonitor} from "./util";


/*
- [ ] Pet. Name. Kind. Gold rainbow dark level. Eat per second
- [ ] Coins. Rainbows.
- [ ] Tilemap but position anywhere as long as not colliding
- [ ] Click to target pets
- [ ] Egg spot to hatch new pets
 */

Rect.prototype.contains_rect = function(rect:Rect):boolean {
    if(!this.contains(new Point(rect.x,rect.y))) return false
    if(!this.contains(new Point(rect.x,rect.y+rect.h))) return false
    if(!this.contains(new Point(rect.x+rect.w,rect.y))) return false
    if(!this.contains(new Point(rect.x+rect.w,rect.y+rect.h))) return false
    return true
}

type PetLevel = "normal" | "gold" | "rainbow" |"darkmatter"
type PetState = "sitting" | "eating" | "moving"
const TS = 20


class Pet {
    name:string
    kind:string
    level:PetLevel
    run_speed:number
    eat_speed:number // eat per second
    color:string
    bounds:Rect
    target:any
    state: PetState
    constructor() {
        this.name = "bob"
        this.kind = "cat"
        this.level = "normal"
        this.run_speed = 2
        this.eat_speed = 10
        this.color = "green"
        this.bounds = new Rect(0,0,TS,TS)
        this.target = null
    }
}

class Coins {
    alive: boolean;
    constructor(number: number) {
        this.name = "coins"
        this.count = number
        this.bounds = new Rect(0,0,TS,TS)
        this.alive = true
    }

    bounds: Rect
    name:string
    count:number
}

class Player {
    bounds:Rect
    color:string
    constructor() {
        this.bounds = new Rect(0,0, TS*2, TS*2)
        this.color = 'blue'
    }
}

type GameState = {
    coins: Coins[];
    edge:Rect,
    walls:Rect[],
    pets:Pet[],
}

class BoardView extends BaseView {
    private board: GridModel;
    private state: GameState;

    constructor(state:GameState) {
        super('board-view')
        this.state = state
    }

    draw(g: SurfaceContext): void {
        g.fill(this.state.edge,'gray')
        this.state.walls.forEach(wall => {
            g.fill(wall,'darkgreen')
        })
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

}

class PlayerView extends BaseView {
    private player: Player;
    constructor(player: Player) {
        super("player");
        this.player = player
    }
    draw(g: SurfaceContext): void {
        g.fill(this.player.bounds, this.player.color)
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(new Size(10,10))
        return this.size()
    }
}

class PetView extends BaseView {
    private state: GameState;

    constructor(state: GameState) {
        super("pets");
        this.state = state
    }
    draw(g: SurfaceContext): void {
        this.state.pets.forEach(pet => {
            let rect = pet.bounds
            let color = pet.color
            if(pet.state === 'eating') {
                color = '#d20e71'
            }
            if(pet.state === 'moving') {
                color = '#e948fd'
            }
            if(pet.state === "sitting") {
                color = '#bc23c7'
            }
            g.fill(rect,color)
        })
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

}

class ClickView extends BaseView {
    private state: GameState;


    constructor(state:GameState) {
        super("click-view");
        this.state = state
    }
    draw(g: SurfaceContext): void {
        this.state.coins.forEach(coin => {
            if(coin.alive) {
                g.fill(coin.bounds, '#ffdd35')
            }
        })
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

    override input(event: CoolEvent) {
        if(event.type === POINTER_DOWN) {
            let pt = (event as PointerEvent).position
            let coins = this.state.coins.find(c => c.bounds.contains(pt))
            if(coins) {
                this.state.pets.forEach((pet:Pet) => {
                    pet.target = coins
                })
            }
        }
    }

}

export function start() {
    let surface = new CanvasSurface(640, 480);
    let root = new LayerView()


    let state:GameState = {
        edge: new Rect(0,0,600,400),
        walls: [
            new Rect(-100,-50,200,100),
            new Rect(200,50,50,50),
            new Rect(400,240,50,50),
        ],
        pets:[],
        coins:[]
    }

    for(let i=0;i<1; i++) {
        let pet = new Pet()
        pet.bounds.x = randi(0,200)
        pet.bounds.y = randi(0,200)
        pet.color = 'yellow'
        state.pets.push(pet)
    }

    for(let i=0; i<5; i++) {
        let coin = new Coins(randi(10,100))
        coin.bounds.x = randi(0,400)
        coin.bounds.y = randi(0,400)
        state.coins.push(coin)
    }


    let board_view = new BoardView(state)
    root.add(board_view)

    let player = new Player()
    player.bounds.x = 50
    player.bounds.y = 100
    let player_view = new PlayerView(player)
    root.add(player_view)

    let pet_view = new PetView(state)
    root.add(pet_view)

    let click_view = new ClickView(state)
    root.add(click_view)

    surface.addToPage();
    surface.set_root(root);
    surface.start()

    function distance(p1:Point, p2:Point):number {
        let p3 = p1.subtract(p2)
        return Math.sqrt(p3.x*p3.x + p3.y*p3.y)
    }
    function dir(p1:Point, p2:Point):Point {
        let len = distance(p1,p2)*2
        let p3 = p1.subtract(p2)
        p3.x = p3.x/len
        p3.y = p3.y/len
        return p3
    }
    let kbd = new KeyboardMonitor()
    kbd.monitor(surface)

    function update() {
        let off = new Point(0,0)
        if(kbd.is_down('ArrowLeft'))  off.x = -1
        if(kbd.is_down('ArrowRight')) off.x = +1
        if(kbd.is_down('ArrowUp'))    off.y = -1
        if(kbd.is_down('ArrowDown'))  off.y = +1

        let bounds = new Rect(player.bounds.x,player.bounds.y,player.bounds.w, player.bounds.h)
        bounds.add_position(off.scale(5))

        let hit = state.walls.find(wall =>wall.intersects(bounds))
        let inside = state.edge.contains_rect(bounds)
        if(!hit && inside) player.bounds = bounds

        state.pets.forEach((pet:Pet) => {
            if(pet.target === null) {
                if(player.bounds.intersects(pet.bounds)) {
                    pet.state = 'sitting'
                } else {
                    pet.state = 'moving'
                    let diff = player.bounds.center().subtract(pet.bounds.center())
                    pet.bounds.add_position(diff.unit().scale(pet.run_speed))
                }
            }
            if(pet.target !== null) {
                let target:Coins = pet.target as Coins
                // if pet overlaps the target
                if(target.bounds.intersects(pet.bounds)) {
                    pet.state = 'eating'
                    target.count -= pet.eat_speed
                    if(target.count < 0) {
                        target.alive = false
                        pet.target = null
                    }
                } else {
                    let diff = target.bounds.center().subtract(pet.bounds.center())
                    let off = diff.unit()
                    pet.bounds.add_position(off.scale(pet.run_speed))
                    pet.state = 'moving'
                }
            }
        })
    }
    function refresh() {
        update()
        surface.repaint()
        requestAnimationFrame(refresh)
    }
    requestAnimationFrame(refresh)
}