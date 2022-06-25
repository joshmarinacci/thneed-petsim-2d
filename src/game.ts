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
    ActionButton, AssetsDoc,
    BaseView,
    CanvasSurface, COMMAND_ACTION,
    CoolEvent, Header, LayerView, load_assets_from_json, Point,
    POINTER_DOWN, PointerEvent,
    randi,
    Rect, Size, Sprite,
    SurfaceContext, VBox
} from "thneed-gfx";
import {KeyboardMonitor} from "./util";

// @ts-ignore
import assets_data from "./petsim2d.json"



type PetLevel = "normal" | "gold" | "rainbow" |"darkmatter"
type PetState = "sitting" | "eating" | "moving"
const TS = 8*4


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
    sprite: Sprite
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

class Egg {
    kind:string
    level:PetLevel
    bounds:Rect
    constructor() {
        this.kind = "cat"
        this.level = "normal"
        this.bounds = new Rect(0,0,TS, TS)
    }
}
class Coins {
    alive: boolean;
    sprite: Sprite;

    constructor(number: number, sprite: Sprite) {
        this.name = "coins"
        this.count = number
        this.bounds = new Rect(0,0,TS, TS)
        this.alive = true
        this.sprite = sprite
    }

    bounds: Rect
    name:string
    count:number
}

class Player {
    bounds:Rect
    color:string
    constructor() {
        this.bounds = new Rect(0,0, TS,TS)
        this.color = 'blue'
    }
}

type GameState = {
    coins: Coins[];
    edge:Rect,
    walls:Rect[],
    pets:Pet[],
    eggs:Egg[],
    coin_count:number,
    camera_scroll:Point,
}

class BoardView extends LayerView {
    private state: GameState;
    private egg_sprite: Sprite

    constructor(state:GameState, sprite:Sprite) {
        super('board-view')
        this.state = state
        this.egg_sprite = sprite
    }

    draw(g: CanvasSurface): void {
        g.ctx.save()
        g.ctx.translate(this.state.camera_scroll.x, this.state.camera_scroll.y)
        g.fill(this.state.edge,'#320404')
        this.state.walls.forEach(wall => g.fill(wall,'darkgreen'))
        this.state.eggs.forEach(egg => g.draw_sprite(egg.bounds.position(), this.egg_sprite))
        g.ctx.restore()
    }
}

class PlayerView extends LayerView {
    private player: Player;
    private sprite: Sprite;
    private state: GameState;

    constructor(state: GameState, player: Player, sprite: Sprite) {
        super("player");
        this.player = player
        this.sprite = sprite
        this.state = state
    }
    draw(g: SurfaceContext): void {
        g.draw_sprite(this.player.bounds.position().add(this.state.camera_scroll), this.sprite)
    }
}

class PetView extends LayerView {
    private state: GameState;
    constructor(state: GameState) {
        super("pets");
        this.state = state
    }
    draw(g: SurfaceContext): void {
        this.state.pets.forEach(pet => {
            g.draw_sprite(pet.bounds.position().add(this.state.camera_scroll), pet.sprite)
        })
    }
}

class CoinView extends BaseView {
    private state: GameState;


    constructor(state:GameState) {
        super("click-view");
        this.state = state
    }
    draw(g: SurfaceContext): void {
        this.state.coins.forEach(coin => {
            if(coin.alive) {
                g.draw_sprite(coin.bounds.position().add(this.state.camera_scroll),coin.sprite)
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
            pt = pt.subtract(this.state.camera_scroll)
            let coin = this.state.coins.find(c => c.bounds.contains(pt) && c.alive)
            if(coin) {
                this.state.pets.forEach((pet:Pet) => {
                    pet.target = coin
                })
            }
        }
    }

}

class EggStoreView extends LayerView {
    private state: GameState;
    private assets: AssetsDoc;
    constructor(state: GameState, assets:AssetsDoc) {
        super("egg-store-view");
        this.state = state
        this.assets = assets

        let box = new VBox()
        let header = new Header()
        header.set_caption("Egg Store")
        box.add(header)

        let buy = new ActionButton()
        buy.set_caption("buy")
        buy.on(COMMAND_ACTION,() => {
            this.state.coin_count -= 100
            let pet = new Pet()
            pet.sprite = assets.find_sprite('main','dog')
            pet.kind = 'dog'
            pet.color = 'brown'
            this.state.pets.push(pet)
            this.set_visible(false)
        })
        box.add(buy)
        this.add(box)
    }
    draw(g: SurfaceContext): void {
        g.fillBackgroundSize(this.size(),'#ccffee')
        g.draw_sprite(new Point(50,30),this.assets.find_sprite('main','dog'))
    }

    layout(g: SurfaceContext, available: Size): Size {
        return super.layout(g,new Size(400,300))
    }

}

class ScoreOverlay extends LayerView {
    private state: GameState;
    constructor(state: GameState) {
        super("score-overlay");
        this.state = state
    }
    override draw(g: CanvasSurface) {
        g.ctx.save()
        g.ctx.translate(500,300)
        g.fill(new Rect(0,0, 100, 100), 'white')
        g.fillStandardText(`coins: ${this.state.coin_count}`,10,20)
        g.fillStandardText(`pets: ${this.state.pets.length}`, 10, 40)
        g.ctx.restore()
    }
}



function make_coin(state:GameState, assets:AssetsDoc) {
    if(state.coins.length > 10) return
    let coin = new Coins(randi(10,100), assets.find_sprite('main','coins'))
    coin.bounds.x = randi(0,400)
    coin.bounds.y = randi(0,400)
    state.coins.push(coin)
}

const SCREEN_BOUNDS = new Size(640,480)
export function start() {
    let assets = load_assets_from_json(assets_data)
    let surface = new CanvasSurface(SCREEN_BOUNDS.w,SCREEN_BOUNDS.h);
    surface.set_sprite_scale(4)
    surface.set_smooth_sprites(false)
    let root = new LayerView()


    let state:GameState = {
        edge: new Rect(-300,-300,1200,800),
        walls: [
            new Rect(-100,-50,200,100),
            new Rect(200,50,50,50),
            new Rect(400,240,50,50),
        ],
        pets:[],
        coins:[],
        eggs:[],
        coin_count: 0,
        camera_scroll: new Point(0,0),
    }

    for(let i=0;i<1; i++) {
        let pet = new Pet()
        pet.bounds.x = randi(0,200)
        pet.bounds.y = randi(0,200)
        pet.color = 'yellow'
        pet.sprite = assets.find_sprite('main','cat')
        state.pets.push(pet)
    }
    for(let i=0; i<5; i++) make_coin(state, assets)

    let cat_egg = new Egg()
    cat_egg.kind = 'cat'
    cat_egg.bounds = new Rect(200,200,30,30)
    state.eggs.push(cat_egg)


    let board_view = new BoardView(state, assets.find_sprite('main','egg'))
    root.add(board_view)

    let player = new Player()
    player.bounds.x = 50
    player.bounds.y = 100
    let player_view = new PlayerView(state, player, assets.find_sprite('main','player'))
    root.add(player_view)

    let pet_view = new PetView(state)
    root.add(pet_view)

    let coin_view = new CoinView(state)
    root.add(coin_view)

    let egg_button = new ActionButton()
    egg_button.set_caption("buy egg")
    egg_button.set_visible(false)
    root.add(egg_button)

    let egg_view = new EggStoreView(state, assets)
    egg_view.set_position(new Point(100,50))
    egg_view.set_visible(false)
    root.add(egg_view)


    egg_button.on(COMMAND_ACTION,() =>  egg_view.set_visible(true))

    root.add(new ScoreOverlay(state))

    surface.addToPage();
    surface.set_root(root);
    surface.start()

    let kbd = new KeyboardMonitor()
    kbd.monitor(surface)

    function update_player() {
        let off = new Point(0,0)
        if(kbd.is_down('ArrowLeft') || kbd.is_down('KeyA'))  off.x = -1
        if(kbd.is_down('ArrowRight') || kbd.is_down('KeyD')) off.x = +1
        if(kbd.is_down('ArrowUp') || kbd.is_down('KeyW'))    off.y = -1
        if(kbd.is_down('ArrowDown') || kbd.is_down('KeyS'))  off.y = +1

        let bounds = new Rect(player.bounds.x,player.bounds.y,player.bounds.w, player.bounds.h)
        bounds.add_position(off.scale(5))

        let hit = state.walls.find(wall =>wall.intersects(bounds))
        if(hit) return
        // @ts-ignore
        let inside = state.edge.contains_rect(bounds)
        if(!inside) return
        player.bounds = bounds

        //scroll to keep the player in the scroll bounds
        let scroll_bounds = new Rect(200,200,SCREEN_BOUNDS.w-200*2,SCREEN_BOUNDS.h-200*2)
        state.camera_scroll = state.camera_scroll.constrain(scroll_bounds.subtract(player.bounds.position()))

        state.eggs.forEach(egg => {
            if(player.bounds.intersects(egg.bounds)) {
                egg_button.set_visible(true)
                egg_button.set_position(egg.bounds.center().add(state.camera_scroll))
            } else {
                egg_button.set_visible(false)
            }
        })
    }

    function update_pets() {
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
                    state.coin_count += pet.eat_speed
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

    setInterval(() => {
        make_coin(state, assets)
    },5*1000)

    function update() {
        update_player()
        update_pets()
    }
    function refresh() {
        update()
        surface.repaint()
        requestAnimationFrame(refresh)
    }
    requestAnimationFrame(refresh)
}