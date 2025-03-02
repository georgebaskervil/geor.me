import {
    Accordion as BaseAccordion,
} from "@/components/ui/accordion";
import type { InferEntrySchema, RenderedContent } from "astro:content";
import { Badge } from "./ui/badge";

type Post = {
    id: string;
    body?: string;
    collection: "blog";
    data: InferEntrySchema<"blog">;
    rendered?: RenderedContent;
    filePath?: string;
    selected: boolean;
}

interface Props {
    path: string;
    data: Post[];
}

export function BlogList({ path, data }: Props) {
    return (
        <BaseAccordion className="w-full" type="single"
            {...(data.findIndex(item => item.selected) !== -1 && {
                defaultValue: `item-${data.findIndex(item => item.selected)}`
            })}
        >
            {data.map((item, i) => {
                return (
                    <div
                        className="flex flex-col flex-1 gap-y-2 px-2 py-4 border-b font-medium hover:cursor-pointer group"
                        ref={item.selected ? (ref) => {
                            if (ref) ref.scrollIntoView({ behavior: 'smooth' });
                        } : undefined}
                        key={`item-${i.toFixed()}`}
                        onClick={(_) => {
                            window.location.href = `/${path}/${item.data.slug.toLowerCase()}/`;
                        }}
                    >
                        <div className="flex flex-row justify-between w-full gap-x-2">
                            <div className="flex flex-row justify-between w-full">
                                <span className="sm:group-hover:underline text-left text-nowrap mr-4">
                                    {item.data.title}
                                </span>

                                {item.data.tags.length > 0 && (
                                <div className="flex flex-row md:flex-row-reverse flex-wrap gap-2">
                                        {item.data.tags.sort().map((tag, index) => (
                                            <Badge key={index} variant="outline">{tag}</Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                                <span className="font-normal text-muted-foreground">
                                    {item.data.date.toLocaleDateString("ja-JP")}
                                </span>
                        </div>
                    </div>
                );
            })}
        </BaseAccordion>
    );
}
