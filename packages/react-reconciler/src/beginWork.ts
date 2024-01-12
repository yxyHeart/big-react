import { ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	OffscreenProps,
	createFiberFromFragment,
	createFiberFromOffscreen,
	createWorkInProgress
} from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	OffscreenComponent,
	SuspenseComponent
} from './workTags';
import { mountChildFibers, reconcileChildFibers } from './childFibers';
import { renderWithHooks } from './fiberHooks';
import { Lane } from './fiberLanes';
import { ChildDeletion, Placement, Ref } from './fiberFlags';
import { pushProvider } from './fiberContext';

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case Fragment:
			return updateFragment(wip);
		case ContextProvider:
			return updateContextProvider(wip);
		case SuspenseComponent:
			return updateSuspenseComponent(wip);
		case OffscreenComponent:
			return updateOffscreenComponent(wip);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
};

function updateSuspenseComponent(wip: FiberNode) {
	const current = wip.alternate;
	const nextProps = wip.pendingProps;

	let showFallback = false;
	const didSuspend = true;

	if (didSuspend) {
		showFallback = true;
	}

	const nextPrimaryChildren = nextProps.chidlren;
	const nextFallbackChidlren = nextProps.fallback;

	if (current === null) {
		// mount
		if (showFallback) {
			//挂起
			return mountSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChidlren
			);
		} else {
			//正常
			return mountSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	} else {
		//update
		if (showFallback) {
			//挂起
			return updateSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChidlren
			);
		} else {
			//正常
			return updateSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	}
}

function updateSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const current = wip.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildrenProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildrenProps
	);

	primaryChildFragment.return = wip;
	primaryChildFragment.sibling = null;
	wip.child = primaryChildFragment;

	if (currentFallbackChildFragment !== null) {
		const deletions = wip.deletions;
		if (deletions === null) {
			wip.deletions = [currentFallbackChildFragment];
			wip.flags |= ChildDeletion;
		} else {
			deletions.push(currentFallbackChildFragment);
		}
	}

	return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const current = wip.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildrenProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildrenProps
	);
	let fallbackChildFragment;

	if (currentFallbackChildFragment !== null) {
		fallbackChildFragment = createWorkInProgress(
			currentFallbackChildFragment,
			fallbackChildren
		);
	} else {
		fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);

		fallbackChildFragment.flags |= Placement;
	}

	fallbackChildFragment.return = wip;
	primaryChildren.return = wip;
	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function mountSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const primaryChildrenProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createFiberFromOffscreen(primaryChildrenProps);
	wip.child = primaryChildFragment;
	primaryChildFragment.return = wip;
	return primaryChildFragment;
}

function mountSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const primaryChildrenProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createFiberFromOffscreen(primaryChildrenProps);
	const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);

	fallbackChildFragment.flags |= Placement;

	primaryChildFragment.return = wip;
	fallbackChildFragment.return = wip;
	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function updateOffscreenComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildFibers(wip, nextChildren);
	return wip.child;
}

function updateContextProvider(wip: FiberNode) {
	const providerType = wip.type;
	const context = providerType._context;
	const newProps = wip.pendingProps;

	pushProvider(context, newProps.value);

	const nextChildren = newProps.children;
	reconcilChildren(wip, nextChildren);
	return wip.child;
}

function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
	reconcilChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHooks(wip, renderLane);

	reconcilChildren(wip, nextChildren);
	return wip.child;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;
	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
	wip.memoizedState = memoizedState;

	const nextChildren = wip.memoizedState;

	reconcilChildren(wip, nextChildren);
	return wip.child;
}
function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;

	markRef(wip.alternate, wip);
	reconcilChildren(wip, nextChildren);
	return wip.child;
}

function reconcilChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;
	if (current !== null) {
		wip.child = reconcileChildFibers(wip, current?.child, children);
	} else {
		wip.child = mountChildFibers(wip, null, children);
	}
}

function markRef(current: FiberNode | null, workInProgress: FiberNode) {
	const ref = workInProgress.ref;
	if (
		(current === null && ref !== null) ||
		(current !== null && current.ref !== ref)
	) {
		workInProgress.flags |= Ref;
	}
}
