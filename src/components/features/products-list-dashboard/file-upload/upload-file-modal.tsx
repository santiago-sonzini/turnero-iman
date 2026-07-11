import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";

import { Edit, UploadIcon } from "lucide-react";
import MediaUploader from "./upload-file";
import { useClientMediaQuery } from "@/hooks/useClientMediaQuery";

export function UploadFileModal() {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useClientMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant={"outline"} className="text-black">
            <UploadIcon className="mr-2 h-4 w-4" /> Subir media
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px] md:max-w-[70vw] md:w-[60vw] ">
          <DialogHeader>
            <DialogDescription className="h-[55vh] font-arvo flex flex-col   overflow-y-scroll font-normal">
              <MediaUploader />
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button variant={"outline"} className="text-black ">
          <UploadIcon className="mr-2 h-4 w-4" /> Subir media
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[80vh]">
        <DrawerHeader className="text-left mb-10">
          <DrawerDescription className="h-[55vh]  font-arvo  overflow-y-scroll font-normal">
            <MediaUploader />
          </DrawerDescription>

          <DrawerClose asChild className="mb-24">
            {/* <Button>Cerrar</Button> */}
          </DrawerClose>
        </DrawerHeader>
        <DrawerFooter className="pt-2"></DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
