import { useScene } from "@passeriform/solid-fiber-scene"
import { createWritableMemo } from "@solid-primitives/memo"
import {
    type Accessor,
    type Context,
    type ParentProps,
    type Setter,
    createContext,
    createEffect,
    mergeProps,
    on,
    onCleanup,
    onMount,
    useContext,
} from "solid-js"
import { type Store, createStore } from "solid-js/store"
import { Mesh, Object3D, Raycaster, Vector2 } from "three"

type InteractionState<T extends Mesh> = {
    current: T | undefined
    last: T | undefined
    repeat: boolean
}

const DEFAULT_INTERACTION_STATE = {
    current: undefined,
    last: undefined,
    repeat: false,
}

type InteractionOverridableProps<T extends Mesh> = {
    root: Object3D | undefined
    filter: (meshes: Object3D[]) => T[]
    allowEmptySelection: boolean
}

type TitleCase<S extends string> = S extends `${infer F}${infer R}` ? `${Uppercase<F>}${R}` : S

type InteractionContextValue<T extends Mesh> = {
    raycaster: Raycaster
    interaction: Store<{
        hovered: InteractionState<T>
        selected: InteractionState<T>
    }>
    resetSelected: () => void
} & {
    [K in keyof InteractionOverridableProps<T> as `set${TitleCase<K>}`]: Setter<InteractionOverridableProps<T>[K]>
}

const InteractionContext = createContext<InteractionContextValue<Mesh>>()

type InteractionProviderProps<T extends Mesh> = Partial<InteractionOverridableProps<T>>

const InteractionProvider = <T extends Mesh>(_props: ParentProps<InteractionProviderProps<T>>) => {
    const props = mergeProps(
        {
            root: undefined,
            filter: (meshes: Object3D[]) =>
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Explicit cast to mesh to check static property.
                meshes.filter((object) => (object as Mesh).isMesh).map((object) => object as T),
            allowEmptySelection: false,
        },
        _props,
    )

    const raycaster = new Raycaster()

    const [interaction, setInteraction] = createStore<{
        hovered: InteractionState<T>
        selected: InteractionState<T>
    }>({
        hovered: { ...DEFAULT_INTERACTION_STATE },
        selected: { ...DEFAULT_INTERACTION_STATE },
    })
    const [root, setRoot] = createWritableMemo(() => props.root)
    const [filter, setFilter] = createWritableMemo(() => props.filter)
    const [allowEmptySelection, setAllowEmptySelection] = createWritableMemo(() => props.allowEmptySelection)

    const { camera } = useScene()

    const testNextInteraction = (event: MouseEvent) => {
        if (!root()) {
            return undefined
        }

        raycaster.setFromCamera(
            new Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1),
            camera,
        )

        const intersects = raycaster.intersectObjects([root()!], true)

        const [matched] = filter()(intersects.map((intersection) => intersection.object))

        return matched
    }

    const setHovered = (next: T | undefined) => {
        if (!root()) {
            return
        }

        if (next === interaction.hovered.current) {
            setInteraction("hovered", "repeat", true)
            return
        }

        setInteraction("hovered", { current: next, repeat: false, last: interaction.hovered.current })
    }

    const setSelected = (next: T | undefined) => {
        if (!root()) {
            return
        }

        if (next === interaction.selected.current) {
            setInteraction("selected", "repeat", true)
            return
        }

        if (next === undefined && !allowEmptySelection()) {
            return
        }

        setInteraction("selected", { current: next, repeat: false, last: interaction.selected.current })
    }

    const resetSelected = () => {
        setInteraction("selected", {
            current: undefined,
            repeat: false,
            last: interaction.selected.current,
        })
    }

    const onHover = (event: MouseEvent) => {
        if (!root()) {
            return
        }

        setHovered(testNextInteraction(event))
    }

    const onClick = (event: MouseEvent) => {
        if (!root()) {
            return
        }

        setSelected(testNextInteraction(event))
    }

    createEffect(
        on(
            [() => interaction.selected.current],
            (selected, prevSelected) => {
                if (selected !== prevSelected) {
                    setHovered(undefined)
                }
            },
            { defer: true },
        ),
    )

    createEffect(() => {
        document.body.style.cursor = interaction.hovered.current ? "pointer" : "default"
    })

    onMount(() => {
        window.addEventListener("mousemove", onHover)
        window.addEventListener("click", onClick)
    })

    onCleanup(() => {
        window.removeEventListener("mousemove", onHover)
        window.removeEventListener("click", onClick)
    })

    return (
        <InteractionContext.Provider
            value={{
                interaction,
                raycaster,
                resetSelected,
                setRoot,
                setFilter: setFilter as unknown as Setter<(meshes: Object3D[]) => Mesh[]>,
                setAllowEmptySelection,
            }}
        >
            {props.children}
        </InteractionContext.Provider>
    )
}

type UseInteractionProps<T extends Mesh> = {
    [K in keyof InteractionOverridableProps<T>]?: Accessor<InteractionOverridableProps<T>[K]>
}

export const useInteraction = <T extends Mesh>(props?: UseInteractionProps<T>) => {
    const context = useContext<InteractionContextValue<T> | undefined>(
        InteractionContext as Context<InteractionContextValue<T> | undefined>,
    )

    if (!context) {
        throw new Error("useInteraction must be used within an InteractionProvider")
    }

    createEffect(() => {
        if (props?.root) {
            context.setRoot(props.root())
        }
    })

    createEffect(() => {
        const filter = props?.filter?.()
        if (filter) {
            context.setFilter(() => filter)
        }
    })

    return {
        interaction: context.interaction,
        resetSelected: context.resetSelected,
    }
}

export default InteractionProvider
