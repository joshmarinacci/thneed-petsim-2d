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

// @ts-ignore
Rect.prototype.position = function() {
    return new Point(this.x,this.y)
}

Rect.prototype.add_position = function(pt:Point) {
    this.x += pt.x
    this.y += pt.y
}

// @ts-ignore
Rect.prototype.intersects = function(rect:Rect) {
    if(this.contains(new Point(rect.x,rect.y))) return true
    if(this.contains(new Point(rect.x,rect.y+rect.h))) return true
    if(this.contains(new Point(rect.x+rect.w,rect.y))) return true
    if(this.contains(new Point(rect.x+rect.w,rect.y+rect.h))) return true
    return false
}

// @ts-ignore
Point.prototype.magnitude = function() {
    return Math.sqrt(this.x*this.x + this.y*this.y)
}
// @ts-ignore
Point.prototype.divide = function(val:number) {
    return new Point(this.x/val, this.y/val)
}
// @ts-ignore
Point.prototype.scale = function(val:number) {
    return new Point(this.x*val, this.y*val)
}

/*
- [ ] Pet. Name. Kind. Gold rainbow dark level. Eat per second
- [ ] Coins. Rainbows.
- [ ] Tilemap but position anywhere as long as not colliding
- [ ] Click to target pets
- [ ] Egg spot to hatch new pets
 */

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
        this.run_speed = 5
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

class BoardView extends BaseView {
    private board: GridModel;

    constructor(board: GridModel) {
        super('board-view')
        this.board = board
    }

    draw(g: SurfaceContext): void {
        g.fillBackgroundSize(this.size(),'purple')
        let ctx = (g as CanvasSurface).ctx
        this.board.forEach((w,x,y)=>{
            let color = 'gray'
            if(w === GROUND) color = 'gray'
            if(w === WALL) color = 'green'
            if(w instanceof Coins) {
                color = '#f0f0f0'
            }
            ctx.fillStyle = color
            ctx.fillRect(x*TS,y*TS,TS,TS)
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
    private pets: Pet[];
    constructor(pets: Pet[]) {
        super("pets");
        this.pets = pets
    }
    draw(g: SurfaceContext): void {
        // g.fillBackgroundSize(this.size(),'green')
        this.pets.forEach(pet => {
            let rect = pet.bounds
            let color = pet.color
            if(pet.state === 'eating') {
                color = 'red'
            }
            if(pet.state === 'moving') {
                color = 'yellow'
            }
            if(pet.state === "sitting") {
                color = 'goldenrod'
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
    private board: GridModel;
    private pets: Pet[];
    constructor(board: GridModel, pets: Pet[]) {
        super("click-view");
        this.board = board
        this.pets = pets
    }
    draw(g: SurfaceContext): void {
    }

    layout(g: SurfaceContext, available: Size): Size {
        this.set_size(available)
        return this.size()
    }

    override input(event: CoolEvent) {
        if(event.type === POINTER_DOWN) {
            let pt = (event as PointerEvent).position.divide_floor(TS)
            let obj = this.board.get_at(pt)
            if(obj instanceof Coins) {
                let coins:Coins = obj as Coins
                coins.bounds.x = pt.x * TS
                coins.bounds.y = pt.y * TS
                this.pets.forEach((pet:Pet) => {
                    pet.target = coins
                })
            }
        }
    }

}
const GROUND = 1
const WALL = 2
function init_board(board: GridModel) {
    board.fill_all(()=>GROUND)
    board.fill_row(0, ()=> WALL)
    board.fill_row(19, ()=> WALL)
    board.fill_col(0,()=>WALL)
    board.fill_col(19, () => WALL)
    board.set_xy(10,5, new Coins(1000))
}

export function start() {
    let surface = new CanvasSurface(640, 480);
    let root = new LayerView()
    let board = new GridModel(new Size(20,20))
    init_board(board)
    let board_view = new BoardView(board)
    root.add(board_view)

    let player = new Player()
    player.bounds.x = 50
    player.bounds.y = 100
    let player_view = new PlayerView(player)
    root.add(player_view)

    let pets:Pet[] = []
    for(let i=0;i<1; i++) {
        let pet = new Pet()
        pet.bounds.x = randi(0,200)
        pet.bounds.y = randi(0,200)
        pet.color = 'yellow'
        pets.push(pet)
    }
    let pet_view = new PetView(pets)
    root.add(pet_view)

    let click_view = new ClickView(board,pets)
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

        let pos = new Point(player.bounds.x, player.bounds.y)
        let new_pos = pos.add(off)
        let new_cell = new_pos.divide_floor(TS)
        let spot = board.get_at(new_cell)
        if(spot === GROUND) {
            player.bounds.x = new_pos.x
            player.bounds.y = new_pos.y
        }
        if(spot === WALL) {
            //hit a wall
        }

        pets.forEach((pet:Pet) => {
            if(pet.target === null) {
                if(player.bounds.intersects(pet.bounds)) {
                    pet.state = 'sitting'
                } else {
                    pet.state = 'moving'
                    let pet_pos = pet.bounds.position()
                    let pla_pos = player.bounds.position()
                    let diff = pla_pos.subtract(pet_pos)
                    let len = diff.magnitude()
                    let unit = diff.divide(len)
                    unit = unit.scale(0.5)
                    pet.bounds.add_position(unit)
                }
            }
            if(pet.target !== null) {
                let target:Coins = pet.target as Coins
                // if pet overlaps the target
                if(target.bounds.intersects(pet.bounds)) {
                    pet.state = 'eating'
                    target.count -= 10
                    if(target.count < 0) {
                        console.log("done")
                        target.alive = false
                    }
                } else {
                    let diff = target.bounds.position().subtract(pet.bounds.position())
                    let off = diff.divide(diff.magnitude())
                    // let off = dir(pet.position, new Point(target.bounds.x, target.bounds.y))
                    // pet.position = pet.position.subtract(off)
                    pet.bounds.add_position(off)
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