import * as path from 'path';
import { Graph } from 'graphlib';
import { Mapping } from './types';

const getParentFolder = (file: string) => file.substring(0, file.lastIndexOf(path.sep));

const getParentFolders = (file: string, terminationFolder: string): string[] => {
    const folders: string[] = [];
    let folder = path.resolve(file, '..');

    while (folder !== terminationFolder) {
        folders.push(folder);
        folder = path.resolve(folder, '..');
    }

    folders.push(terminationFolder);

    return folders;
};

const getCommonRoot = (file1: string, file2: string): string => {
    let commonRoot = '';

    for (let i = 0; i < Math.min(file1.length, file2.length); i += 1) {
        if (file1.charAt(i) === file2.charAt(i)) {
            commonRoot += file1.charAt(i);
        } else {
            break;
        }
    }

    return commonRoot.substring(0, commonRoot.lastIndexOf(path.sep));
};

const createEdgeKey = (source: string, target: string): string => `${source}>${target}`;

export default (fileDependencyGraph: Graph) => {
    const graph = new Graph();
    const mapping: { [key: string]: string } = {};

    fileDependencyGraph.nodes().forEach(node => {
        const parentFolders = getParentFolders(node, process.cwd());

        parentFolders.forEach(folder => graph.setNode(folder));

        for (let i = 1; i < parentFolders.length; i += 1) {
            graph.setEdge(parentFolders[i], parentFolders[i - 1]);
            mapping[createEdgeKey(parentFolders[i], parentFolders[i - 1])] = 'parent';
        }
    });

    fileDependencyGraph.edges().forEach(edge => {
        const source = getParentFolder(edge.v);
        const target = getParentFolder(edge.w);

        if (source.startsWith(target) || source === target) {
            // same folder or reference down the subtree
            return;
        }

        if (target.startsWith(source)) {
            // reference up the subtree
            graph.setEdge(source, target);
            mapping[createEdgeKey(source, target)] = `${edge.v} => ${edge.w}`;
            return;
        }

        // different subtrees
        const commonRoot = getCommonRoot(edge.v, edge.w);
        const parentFolders = getParentFolders(edge.w, commonRoot);

        parentFolders.pop(); // ditch common root
        parentFolders.forEach(parent => {
            graph.setEdge(source, parent);
            mapping[createEdgeKey(source, parent)] = `${edge.v} => ${edge.w}`;
        });
    });

    const mapFunction: Mapping = (source: string, target: string): string =>
        mapping[createEdgeKey(source, target)];

    return {
        graph,
        mapFunction,
    };
};