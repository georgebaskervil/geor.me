import {
    Accordion as BaseAccordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button"
import type { InferEntrySchema } from "astro:content";

type Project = {
    id: string;
    collection: "projects";
    data: InferEntrySchema<"projects">;
    selected: boolean;
}

interface Props {
    path: string;
    data: Project[];
}

export function ProjectList({ path, data }: Props) {
    return (
        <BaseAccordion className="w-full" type="single"
            {...(data.findIndex(item => item.selected) !== -1 && {
                defaultValue: `item-${data.findIndex(item => item.selected)}`
            })}
            collapsible
        >
            {data.map((item, i) => {
                return (
                    <AccordionItem
                        ref={item.selected ? (ref) => {
                            if (ref) ref.scrollIntoView({ behavior: 'smooth' });
                        } : undefined}
                        key={`item-${i.toFixed()}`}
                        value={`item-${i.toFixed()}`}
                    >
                        <AccordionTrigger
                            tags={item.data.tags}
                            onClick={(_) => {
                                const currentPath = window.location.pathname.toLowerCase();
                                const itemPath = `/${path}/${item.data.title.toLowerCase()}/`;
                                if (currentPath === itemPath) {
                                    window.history.replaceState("", "", `/${path}/`);
                                } else {
                                    window.history.replaceState("", "", `${itemPath}`);
                                }
                            }}>
                            {item.data.title}
                        </AccordionTrigger>
                        <AccordionContent className="flex flex-col gap-2">
                            <p className="text-muted-foreground text-pretty">
                                {item.data.description}
                            </p>
                            <div className="ml-auto max-w-fit">
                                {item.data.links && item.data.links.map((link, i) => (
                                    <a href={link.url} key={i} rel="noopener noreferrer">
                                        <Button key={i} variant="link">{link.name}</Button>
                                    </a>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </BaseAccordion>
    );
}