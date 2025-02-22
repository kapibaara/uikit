import React from 'react';

import {useForkRef, useUniqId} from '../../hooks';
import {SelectControl} from '../Select/components';
import {SelectPopup} from '../Select/components/SelectPopup/SelectPopup';
import {TreeList} from '../TreeList';
import type {TreeListOnItemClick, TreeListRenderItem} from '../TreeList/types';
import {Flex} from '../layout';
import {useMobile} from '../mobile';
import {scrollToListItem, useList, useListState} from '../useList';
import type {ListItemId} from '../useList';
import {block} from '../utils/cn';
import type {CnMods} from '../utils/cn';

import {TreeSelectItem} from './TreeSelectItem';
import {useTreeSelectSelection, useValue} from './hooks/useTreeSelectSelection';
import type {TreeSelectProps, TreeSelectRenderControlProps} from './types';

import './TreeSelect.scss';

const b = block('tree-select');

const defaultItemRenderer: TreeListRenderItem<unknown> = (renderState) => {
    return <TreeSelectItem {...renderState.props} {...renderState.renderContext} />;
};

export const TreeSelect = React.forwardRef(function TreeSelect<T>(
    {
        id,
        qa,
        placement,
        slotBeforeListBody,
        slotAfterListBody,
        size,
        items,
        defaultOpen,
        width,
        containerRef: propsContainerRef,
        className,
        containerClassName,
        popupClassName,
        open: propsOpen,
        multiple,
        popupWidth,
        expandedById,
        disabledById,
        activeItemId,
        defaultValue,
        popupDisablePortal,
        groupsBehavior = 'expandable',
        value: propsValue,
        onClose,
        onUpdate,
        getId,
        onOpenChange,
        renderControl,
        renderItem = defaultItemRenderer as TreeListRenderItem<T>,
        renderContainer,
        onItemClick,
        setActiveItemId: propsSetActiveItemId,
        mapItemDataToProps,
    }: TreeSelectProps<T>,
    ref: React.Ref<HTMLButtonElement>,
) {
    const mobile = useMobile();
    const uniqId = useUniqId();
    const treeSelectId = id ?? uniqId;

    const controlWrapRef = React.useRef<HTMLDivElement>(null);
    const controlRef = React.useRef<HTMLElement>(null);
    const containerRefLocal = React.useRef<HTMLDivElement>(null);
    const containerRef = propsContainerRef ?? containerRefLocal;

    const handleControlRef = useForkRef(ref, controlRef);

    const {value, setInnerValue, selected} = useValue({
        value: propsValue,
        defaultValue,
    });

    const listState = useListState({
        expandedById,
        disabledById,
        activeItemId,
        selectedById: selected,
    });

    const setActiveItemId = propsSetActiveItemId ?? listState.setActiveItemId;

    const listParsedState = useList({
        items,
        getId,
        ...listState,
    });

    const wrappedOnUpdate = React.useCallback(
        (ids: ListItemId[]) =>
            onUpdate?.(
                ids,
                ids.map((id) => listParsedState.itemsById[id]),
            ),
        [listParsedState.itemsById, onUpdate],
    );

    const {open, toggleOpen, handleClearValue, handleMultipleSelection, handleSingleSelection} =
        useTreeSelectSelection({
            setInnerValue,
            value,
            onUpdate: wrappedOnUpdate,
            defaultOpen,
            open: propsOpen,
            onClose,
            onOpenChange,
        });

    const handleItemClick = React.useCallback<TreeListOnItemClick<T>>(
        ({id: listItemId, data, groupState, isLastItem, itemState}) => {
            const defaultHandleClick = () => {
                if (listState.disabledById[listItemId]) return;

                // always activate selected item
                setActiveItemId(listItemId);

                if (groupState && groupsBehavior === 'expandable') {
                    listState.setExpanded((state) => ({
                        ...state,
                        // toggle expanded state by id, by default all groups expanded
                        [listItemId]:
                            typeof state[listItemId] === 'boolean' ? !state[listItemId] : false,
                    }));
                } else if (multiple) {
                    handleMultipleSelection(listItemId);
                } else {
                    handleSingleSelection(listItemId);
                    toggleOpen(false);
                }
            };

            if (onItemClick) {
                return onItemClick({
                    id: listItemId,
                    data,
                    groupState,
                    itemState,
                    isLastItem,
                    disabled: listState.disabledById[listItemId],
                    defaultClickCallback: defaultHandleClick,
                });
            }

            return defaultHandleClick();
        },
        [
            onItemClick,
            listState,
            setActiveItemId,
            groupsBehavior,
            multiple,
            handleMultipleSelection,
            handleSingleSelection,
            toggleOpen,
        ],
    );

    // restoring focus when popup opens
    React.useLayoutEffect(() => {
        if (open) {
            const lastSelectedItemId = value[value.length - 1];
            containerRef.current?.focus();

            setActiveItemId(lastSelectedItemId);

            if (lastSelectedItemId) {
                scrollToListItem(lastSelectedItemId, containerRef.current);
            }
        }
        // subscribe only in open event
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleClose = React.useCallback(() => toggleOpen(false), [toggleOpen]);

    const controlProps: TreeSelectRenderControlProps = {
        open,
        toggleOpen,
        clearValue: handleClearValue,
        ref: handleControlRef,
        size,
        value,
        id: treeSelectId,
        activeItemId: listState.activeItemId,
    };

    const togglerNode = renderControl ? (
        renderControl(controlProps)
    ) : (
        <SelectControl
            {...controlProps}
            selectedOptionsContent={React.Children.toArray(
                value.map((itemId) => mapItemDataToProps(listParsedState.itemsById[itemId]).title),
            ).join(', ')}
            view="normal"
            pin="round-round"
            popupId={`tree-select-popup-${treeSelectId}`}
            selectId={`tree-select-${treeSelectId}`}
        />
    );

    const mods: CnMods = {
        ...(width === 'max' && {width}),
    };

    const inlineStyles: React.CSSProperties = {};

    if (typeof width === 'number') {
        inlineStyles.width = width;
    }

    return (
        <Flex
            direction="column"
            gap="5"
            ref={controlWrapRef}
            className={b(mods, className)}
            style={inlineStyles}
        >
            {togglerNode}
            <SelectPopup
                ref={controlWrapRef}
                className={b('popup', popupClassName)}
                controlRef={controlRef}
                width={popupWidth}
                placement={placement}
                open={open}
                handleClose={handleClose}
                disablePortal={popupDisablePortal}
                mobile={mobile}
                id={`tree-select-popup-${treeSelectId}`}
            >
                {slotBeforeListBody}

                <TreeList<T>
                    size={size}
                    className={containerClassName}
                    qa={qa}
                    multiple={multiple}
                    id={`list-${treeSelectId}`}
                    containerRef={containerRef}
                    getId={getId}
                    disabledById={listState.disabledById}
                    selectedById={listState.selectedById}
                    expandedById={listState.expandedById}
                    activeItemId={listState.activeItemId}
                    setActiveItemId={setActiveItemId}
                    onItemClick={handleItemClick}
                    items={items}
                    renderContainer={renderContainer}
                    mapItemDataToProps={mapItemDataToProps}
                    renderItem={renderItem ?? defaultItemRenderer}
                />

                {slotAfterListBody}
            </SelectPopup>
        </Flex>
    );
}) as <T>(props: TreeSelectProps<T> & {ref?: React.Ref<HTMLDivElement>}) => React.ReactElement;
