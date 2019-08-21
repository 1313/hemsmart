import { Groupable } from './Groupable';
import TinyQueue from 'tinyqueue';

export interface Item extends Groupable {
    weight: number;
    value: number;
}

interface BranchAndBoundInput {
    items: Item[];
    capacity: number;
}

function sortByValueWeightRatio(a: Item, b: Item): number {
    return b.value / b.weight - a.value / a.weight;
}

interface Node {
    items: Item[];
    value: number;
    level: number;
    weight: number;
    upperBound: number;
}

function calculateUpperBound(node: Node, input: BranchAndBoundInput): number {
    if (node.weight >= input.capacity) {
        return 0;
    }
    // Start with the current value
    let upperBoundValue = node.value;

    // Calculate bound on levels below current
    let boundLevel = node.level + 1;
    // Start totalWeight with node.weight
    let totalWeight = node.weight;

    // Hypothetically pick all items below in greedy manner
    while (
        boundLevel < input.items.length &&
        totalWeight + input.items[boundLevel].weight <= input.capacity
    ) {
        totalWeight += input.items[boundLevel].weight;
        upperBoundValue += input.items[boundLevel].value;
        boundLevel++;
    }

    //If there are items left to pick
    if (boundLevel < input.items.length) {
        // Take a fraction of the next item to fill the knapsack
        upperBoundValue +
            ((input.capacity - totalWeight) * input.items[boundLevel].value) /
                input.items[boundLevel].weight;
    }

    return upperBoundValue;
}

export interface BranchAndBoundOutput {
    maxValue: number;
    items: Item[];
}

function pickItemAndGoLeft(
    input: BranchAndBoundInput,
    nextLevel: number,
    current: Node,
): Node {
    // Take the next item, increase weight and value item
    const item = input.items[nextLevel];
    const leftNode = {
        ...current,
        level: nextLevel,
        weight: current.weight + item.weight,
        value: current.value + item.value,
        items: [...current.items, item],
    };
    // Calculate upper bound for if we pick the current item
    leftNode.upperBound = calculateUpperBound(leftNode, input);
    return leftNode;
}
function skipItemAndGoRight(
    current: Node,
    nextLevel: number,
    input: BranchAndBoundInput,
): Node {
    // Don't take the item (keep same weight and value and go to next level)
    const rightNode = {
        ...current,
        level: nextLevel,
    };
    // Calculate upperBound for if we skip the current item
    rightNode.upperBound = calculateUpperBound(rightNode, input);
    return rightNode;
}
function newNode(): Node {
    return {
        items: [],
        level: -1,
        value: 0,
        weight: 0,
        upperBound: 0,
    };
}

export function branchAndBound(
    input: BranchAndBoundInput,
): BranchAndBoundOutput {
    input.items.sort(sortByValueWeightRatio);

    let current: Node = newNode();

    const queue: TinyQueue<Node> = new TinyQueue(
        [current],
        (a, b): number => b.upperBound - a.upperBound,
    );

    // Result variables
    let lowerBoundValue = 0;
    let pickedItems: Item[] = [];

    while (queue.length > 0) {
        current = queue.pop() as Node;

        // Knapsack is full
        if (current.level === input.items.length - 1) {
            continue;
        }

        const nextLevel = current.level + 1;

        // Left Node represent that we take an item
        // at current level
        const leftNode = pickItemAndGoLeft(input, nextLevel, current);

        // Update the current best solution
        // I.E lower bound and items selected
        // to represent the new lower bound
        if (
            leftNode.weight <= input.capacity &&
            leftNode.value > lowerBoundValue
        ) {
            lowerBoundValue = leftNode.value;
            pickedItems = leftNode.items;
        }

        // If we found a higher upper bound, search further
        if (leftNode.upperBound > lowerBoundValue) {
            queue.push(leftNode);
        }

        // Right node represent that we don't take the item (keep same weight and value and go to next level)
        const rightNode = skipItemAndGoRight(current, nextLevel, input);

        // If we have found a higher upper bound, continue searching in
        // right direction
        if (rightNode.upperBound > lowerBoundValue) {
            queue.push(rightNode);
        }
    }

    return {
        maxValue: lowerBoundValue,
        items: pickedItems,
    };
}
