import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

export function affectedPages(files, changedFiles) {
  const impacted = new Set(changedFiles);
  const reasons = new Map(changedFiles.map(file => [file, ['direct change']]));
  const references = (path, content, target) => {
    const variants = [target, target.replace(/\.(mdx|[cm]?[jt]sx?)$/, '')];
    if (variants.some(value => content.includes(`/${value}`))) return true;
    const relative = posix.relative(posix.dirname(path), target);
    return [relative, relative.replace(/\.(mdx|[cm]?[jt]sx?)$/, '')].some(value =>
      content.includes(`'${value}'`) || content.includes(`"${value}"`) ||
      content.includes(`'./${value}'`) || content.includes(`"./${value}"`));
  };
  // Expand dependencies transitively; stable sets terminate even for cyclic imports.
  let progress = true;
  while (progress) {
    progress = false;
    for (const [path, content] of Object.entries(files)) {
      if (!/\.(mdx|[cm]?[jt]sx?)$/.test(path)) continue;
      const deps = [...impacted].filter(target => target !== path && references(path, content, target));
      if (/^openapi:/m.test(content) && changedFiles.includes('openapi.json')) deps.push('openapi.json');
      if (changedFiles.includes('docs.json') && path.endsWith('.mdx')) deps.push('docs.json');
      if (deps.length) {
        if (!impacted.has(path)) { impacted.add(path); progress = true; }
        reasons.set(path, [...new Set([...(reasons.get(path) ?? []), ...deps])]);
      }
    }
  }
  const pages = [...impacted].filter(path => path.endsWith('.mdx')).map(path => path.slice(0, -4)).sort();
  return { pages, reasons: Object.fromEntries([...reasons].filter(([path]) => path.endsWith('.mdx'))) };
}
export function inspectImpact(root, base) {
  if (!/^[a-f0-9]{40}$/i.test(base)) throw new Error('Impact base must be a full commit SHA');
  const git = args => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const paths = new Set([...git(['ls-tree', '-r', '--name-only', '-z', base]).split('\0'),
    ...git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']).split('\0')].filter(Boolean));
  const changes = [...new Set([...git(['diff', '--name-only', '-z', base]).split('\0'),
    ...git(['ls-files', '-z', '--others', '--exclude-standard']).split('\0')].filter(Boolean))];
  const files = {};
  for (const path of paths) {
    if (/\.(mdx|[cm]?[jt]sx?)$/.test(path) && existsSync(resolve(root, path))) files[path] = readFileSync(resolve(root, path), 'utf8');
  }
  const result = affectedPages(files, changes);
  const collect = value => {
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value.flatMap(collect);
    if (!value || typeof value !== 'object') return [];
    return ['tabs','groups','pages'].flatMap(key => collect(value[key]));
  };
  const currentNavigation = JSON.parse(readFileSync(resolve(root, 'docs.json'), 'utf8')).navigation;
  const previousNavigation = JSON.parse(git(['show', `${base}:docs.json`])).navigation;
  const published = new Set([...collect(currentNavigation), ...collect(previousNavigation)]);
  result.pages = result.pages.filter(page => published.has(page));
  return { ...result, changedFiles: changes };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(inspectImpact(process.cwd(), process.argv[2])));
}
