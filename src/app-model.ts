import {
    Sheet,
    Sprite,
    Tilemap,
    SpriteGlyph,
    SpriteFont,
    gen_id,
    Palette,
} from "thneed-gfx";

export const GRAYSCALE_PALETTE = [
    '#ff00ff',
    '#f0f0f0',
    '#d0d0d0',
    '#909090',
    '#404040',
];


function obj_to_class(sh, doc:AssetsDoc) {
    if(sh.clazz === 'Sprite') {
        console.log("making a sprite",sh.id,sh.name)
        let sprite = new Sprite(sh.id, sh.name, sh.w, sh.h, doc)
        sprite.data = sh.data
        sprite.sync()
        console.log("called sync")
        return sprite
    }
    if(sh.clazz === 'Tilemap') {
        let tilemap = new Tilemap(sh.id, sh.name, sh.w, sh.h)
        tilemap.data = sh.data
        return tilemap
    }
    if(sh.clazz === 'Sheet') {
        console.log("making a sheet",sh.id,sh.name)
        let sheet = new Sheet(sh.id,sh.name)
        sheet.sprites = sh.sprites.map(sp => obj_to_class(sp, doc))
        return sheet
    }
    if(sh.clazz === 'Font') {
        let font = new SpriteFont(sh.id,sh.name)
        font.glyphs = sh.glyphs.map(g => obj_to_class(g, doc))
        return font
    }
    if(sh.clazz === 'Glyph') {
        let glyph = new SpriteGlyph(sh.id,sh.name,sh.w,sh.h, doc)
        glyph.data = sh.data
        glyph.meta = sh.meta
        if(!glyph.meta.left) glyph.meta.left = 0
        if(!glyph.meta.right) glyph.meta.right = 0
        if(!glyph.meta.baseline) glyph.meta.baseline = 0
        glyph.sync()
        return glyph
    }
    throw new Error(`don't know how to deserialize ${sh.clazz}`)
}

export interface AssetsDoc extends Palette {
    find_sheet(name:String):Sheet
    find_sprite(sheet_name:String, sprite_name:String):Sprite
}

class AssetsDocImpl implements AssetsDoc {
    _color_palette: string[]
    sheets: Sheet[]
    fonts: SpriteFont[]
    maps:Tilemap[]

    constructor() {
        this.sheets = []
        this.fonts = []
        this.maps = []
    }
    get_color_palette(): string[] {
        return this._color_palette
    }

    find_sheet(name: String): Sheet {
        return this.sheets.find(sh => sh.name === name)
    }

    find_sprite(sheet_name: String, sprite_name: String): Sprite {
        let sheet = this.find_sheet(sheet_name)
        return sheet.sprites.find(sp => sp.name === sprite_name)
    }
}

export function load_assets_from_json(data:any):AssetsDoc {
    if(data.version === 1) {
        if(data.fonts && data.fonts.length > 0) {
            console.log("pretending to upgrade the document")
            data.version = 2
        } else {
            console.log("really upgrade")
            data.maps.forEach(mp => {
                console.log("converting",mp)
                mp.clazz = 'Tilemap'
                if(!mp.id) mp.id = gen_id("tilemap")
                if(!mp.name) mp.name = gen_id("unknown")
                return mp
            })
            data.version = 2
        }
    }
    if(data.version === 2) {
        data.color_palette = GRAYSCALE_PALETTE
        data.version = 3
    }
    if(data.version !== 3) throw new Error("we can only parse version 3 json")
    if(data.name) this._name = data.name
    let obj = new AssetsDocImpl()
    obj._color_palette = data.color_palette
    obj.sheets = data.sheets.map(sh => obj_to_class(sh,obj))
    obj.fonts = data.fonts.map(fnt => obj_to_class(fnt, obj))
    obj.maps = data.maps.map(mp => obj_to_class(mp, obj))
    return obj
}

