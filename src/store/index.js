export function Store() {
    const state = global?.state || {
        encode: 'utf-8',
        chapter: [],
        manifest: [],
        spine: [],
        guide: [],
        current_capter: null,
        newRecord: null,
        opfPath: null,
        meta: null,
        epubVersion: null,
    };
    this.set = (key, value) => {
        state[key] = value;
        global.state = state;
        return this;
    };
    this.get = (key) => {
        return global?.state[key];
    };
    return this;
}
