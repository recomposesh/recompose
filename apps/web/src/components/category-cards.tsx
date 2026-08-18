import { flattenTree, type Root } from 'fumadocs-core/page-tree';
import { Card, Cards } from 'fumadocs-ui/components/card';

export function CategoryCards({ tree, urls }: { tree: Root; urls: string[] }) {
  const itemsByUrl = new Map(flattenTree(tree.children).map((item) => [item.url, item]));
  const picked = urls.flatMap((url) => itemsByUrl.get(url) ?? []);

  if (picked.length === 0) return null;

  return (
    <Cards>
      {picked.map((item) => (
        <Card key={item.url} href={item.url} title={item.name} description={item.description} />
      ))}
    </Cards>
  );
}
