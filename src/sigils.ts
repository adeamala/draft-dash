import type { Element } from './game/rules.ts'

// Original element sigils drawn as inline SVG, so there is no third-party art in the game.
const SHAPES: Record<Element, string> = {
  blaze:
    '<path d="M32 4c4 10 14 16 14 30a14 14 0 0 1-28 0c0-7 4-11 7-15 1 6 4 9 7 10-2-9 0-17 0-25z"/>' +
    '<path d="M32 40c3 3 5 6 5 9a5 5 0 0 1-10 0c0-3 2-6 5-9z" opacity=".55"/>',
  frost:
    '<g stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M32 8v48M11 20l42 24M11 44l42-24"/></g>' +
    '<circle cx="32" cy="32" r="6"/><circle cx="32" cy="7" r="4"/><circle cx="32" cy="57" r="4"/>' +
    '<circle cx="10" cy="19.5" r="4"/><circle cx="54" cy="44.5" r="4"/><circle cx="10" cy="44.5" r="4"/><circle cx="54" cy="19.5" r="4"/>',
  volt: '<path d="M37 4 12 36h16l-5 24 29-36H35z"/>',
}

export const sigil = (el: Element) =>
  `<svg class="sigil" viewBox="0 0 64 64" fill="currentColor" aria-hidden="true">${SHAPES[el]}</svg>`

const CYCLE: Element[] = ['blaze', 'frost', 'volt', 'blaze']

export const cycleRow = () =>
  `<div class="cycle" role="img" aria-label="Blaze beats Frost, Frost beats Volt, Volt beats Blaze">${CYCLE.map(
    (el) => `<span class="el-${el}">${sigil(el)}</span>`,
  ).join('<i>beats</i>')}</div>`
