import SceneProvider from "@passeriform/solid-fiber-scene"
import { cleanup, render } from "@solidjs/testing-library"
import type { ComponentProps } from "solid-js"
import { BoxGeometry, Mesh, MeshBasicMaterial } from "three"
import { beforeEach, describe, expect, it, vi } from "vitest"
import InteractionProvider, { useInteraction } from "./Interaction"

const createMeshes = () => {
    const rootMesh = new Mesh()

    const mesh1 = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    mesh1.position.set(-3, 0, -5)
    mesh1.geometry.computeBoundingSphere()
    mesh1.updateMatrixWorld(true)

    const mesh2 = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    mesh2.position.set(3, 0, -5)
    mesh2.geometry.computeBoundingSphere()
    mesh2.updateMatrixWorld(true)

    rootMesh.add(mesh1, mesh2)
    rootMesh.updateMatrixWorld(true)

    const interact = (interactionType: "hover" | "click", item: 0 | 1 | undefined) => {
        const eventType = interactionType === "hover" ? "mousemove" : "click"
        switch (item) {
            case 0:
                return window.dispatchEvent(
                    new MouseEvent(eventType, { clientX: window.innerWidth / 4, clientY: window.innerHeight / 2 }),
                )
            case 1:
                return window.dispatchEvent(
                    new MouseEvent(eventType, {
                        clientX: (window.innerWidth * 3) / 4,
                        clientY: window.innerHeight / 2,
                    }),
                )
            case undefined:
                return window.dispatchEvent(new MouseEvent(eventType, { clientX: 0, clientY: 0 }))
        }
    }

    return { rootMesh, children: [mesh1, mesh2], interact }
}

describe("Interaction", () => {
    const { rootMesh, children, interact } = createMeshes()

    const renderComponentUnderInteraction = (props: ComponentProps<typeof InteractionProvider> = {}) => {
        let context: ReturnType<typeof useInteraction> | undefined
        const TestComponent = () => {
            context = useInteraction()
            return <></>
        }
        render(() => (
            <SceneProvider>
                <InteractionProvider root={rootMesh} {...props}>
                    <TestComponent />
                </InteractionProvider>
            </SceneProvider>
        ))
        if (!context) throw new Error("Context not found")
        return context
    }

    beforeEach(() => {
        vi.clearAllMocks()
        cleanup()
    })

    it("throws if not rendered inside InteractionProvider", () => {
        expect(() =>
            render(() => {
                useInteraction()
                return <></>
            }),
        ).toThrow("useInteraction must be used within an InteractionProvider")
    })

    it("throws if not rendered inside SceneProvider", () => {
        const Component = () => {
            useInteraction()
            return <></>
        }
        expect(() =>
            render(() => (
                <InteractionProvider>
                    <Component />
                </InteractionProvider>
            )),
        ).toThrow("useScene must be used within a SceneProvider")
    })

    it("starts with default interaction state", () => {
        const { interaction } = renderComponentUnderInteraction()

        expect(interaction).toEqual({
            hovered: {
                current: undefined,
                last: undefined,
                repeat: false,
            },
            selected: {
                current: undefined,
                last: undefined,
                repeat: false,
            },
        })
    })

    it("sets cursor style", () => {
        renderComponentUnderInteraction()

        interact("hover", 0)
        expect(document.body.style.cursor).toBe("pointer")

        interact("hover", undefined)
        expect(document.body.style.cursor).toBe("default")
    })

    it("resets selection", () => {
        const { interaction, resetSelected } = renderComponentUnderInteraction()

        interact("click", 0)
        expect(interaction.selected.current).toBe(children[0])

        resetSelected()
        expect(interaction.selected).toEqual({
            current: undefined,
            last: children[0],
            repeat: false,
        })
    })

    describe("hover states", () => {
        it("updates hovered.current on mousemove", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("hover", 0)
            expect(interaction.hovered.current).toBe(children[0])
        })

        it("sets repeat flag when same mesh hovered twice", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("hover", 0)
            expect(interaction.hovered.repeat).toBe(false)

            interact("hover", 0)
            expect(interaction.hovered.repeat).toBe(true)
        })

        it("move hovered.current to hovered.last on hovering away", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("hover", 0)
            expect(interaction.hovered.current).toBe(children[0])

            interact("hover", undefined)
            expect(interaction.hovered.current).toBeUndefined()
            expect(interaction.hovered.last).toBe(children[0])
        })

        it("move next mesh to hovered.current on hovering other mesh", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("hover", 0)
            expect(interaction.hovered.current).toBe(children[0])

            interact("hover", 1)
            expect(interaction.hovered.current).toBe(children[1])
            expect(interaction.hovered.last).toBe(children[0])
        })
    })

    describe("selection states", () => {
        it("updates selected.current on click", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("click", 0)
            expect(interaction.selected.current).toBe(children[0])
        })

        it("sets repeat flag when same mesh selected twice", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("click", 0)
            expect(interaction.selected.repeat).toBe(false)

            interact("click", 0)
            expect(interaction.selected.repeat).toBe(true)
        })

        it("move selected.current to selected.last on selection change", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("click", 0)
            expect(interaction.selected.current).toBe(children[0])

            interact("click", 1)
            expect(interaction.selected.current).toBe(children[1])
            expect(interaction.selected.last).toBe(children[0])
        })
    })

    describe("hover + selection cross interaction", () => {
        it("clears hovered when selected changes", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("hover", 0)
            expect(interaction.hovered.current).toBe(children[0])

            interact("click", 0)
            expect(interaction.selected.current).toBe(children[0])
            expect(interaction.hovered).toEqual({
                current: undefined,
                last: children[0],
                repeat: false,
            })
        })
    })

    describe("provider overrides", () => {
        it("applies custom filter", () => {
            const { interaction } = renderComponentUnderInteraction({
                filter: (meshes) => meshes.filter((mesh) => mesh === children[1]).map((mesh) => mesh as Mesh),
            })

            interact("hover", 0)
            expect(interaction.hovered.current).toBeUndefined()

            interact("hover", 1)
            expect(interaction.hovered.current).toBe(children[1])
        })

        it("updates interaction root", () => {
            const newRoot = new Mesh()
            const { interaction } = renderComponentUnderInteraction({ root: newRoot })

            interact("hover", 0)
            expect(interaction.hovered.current).toBeUndefined()
        })
    })

    describe("allowEmptySelection variations", () => {
        it("move selected.current to selected.last on selection change if allowing empty selection", () => {
            const { interaction } = renderComponentUnderInteraction({ allowEmptySelection: true })

            interact("click", 0)
            expect(interaction.selected.current).toBe(children[0])

            interact("click", undefined)
            expect(interaction.selected.current).toBeUndefined()
            expect(interaction.selected.last).toBe(children[0])
        })

        it("move selected.current to selected.last on selection change if not allowing empty selection", () => {
            const { interaction } = renderComponentUnderInteraction()

            interact("click", 0)
            expect(interaction.selected.current).toBe(children[0])

            interact("click", undefined)
            expect(interaction.selected.current).toBe(children[0])
            expect(interaction.selected.last).toBeUndefined()
        })
    })
})
