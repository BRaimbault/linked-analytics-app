import classes from './styles/demo-tour.module.css'

/* How long the tour shows where it clicks before the click lands */
export const CLICK_DELAY = 700

const RING_LIFETIME = 1400

/* A ring that pulses where the tour clicks, so the eye can follow it */
export const showClickAt = (element: Element): void => {
    const box = element.getBoundingClientRect()
    const ring = document.createElement('div')
    ring.className = classes.clickRing
    ring.style.left = `${box.left + box.width / 2}px`
    ring.style.top = `${box.top + box.height / 2}px`
    ring.setAttribute('aria-hidden', 'true')
    ring.dataset.test = 'tour-click-ring'
    document.body.append(ring)
    setTimeout(() => ring.remove(), RING_LIFETIME)
}
