"use client";

import * as React from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export function Menu() {
  return (
    <NavigationMenu className="w-full hidden md:block">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Home</NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid gap-3 p-6">
              <ListItem href="#" title="ABOUT US">
                Lorem Ipsum...
              </ListItem>
              <ListItem href="#" title="TESTIMONIALS">
                Lorem Ipsum...
              </ListItem>
              <ListItem href="#" title="CONTACTS">
                Lorem Ipsum...
              </ListItem>
              <ListItem href="#" title="GALLERY">
                Lorem Ipsum...
              </ListItem>
              <ListItem href="#" title="BARBERS">
                Lorem Ipsum...
              </ListItem>
              <ListItem href="#" title="SERVICES">
                Lorem Ipsum...
              </ListItem>
              <ListItem href="#" title="CAREERS">
                Lorem Ipsum...
              </ListItem>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem className="ml-auto">
          <Link href="/signup" legacyBehavior passHref>
            <NavigationMenuLink className={navigationMenuTriggerStyle()}>
              SIGN UP
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className,
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";
