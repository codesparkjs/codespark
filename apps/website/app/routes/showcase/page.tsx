import AccordionDemo from './shadcn-ui/accordion';
import ButtonDemo from './shadcn-ui/button';

export default function Showcase() {
  return (
    <div className="px-6 py-14 *:mx-auto *:max-w-(--fd-layout-width)">
      <div className="mx-auto w-[640px] space-y-5">
        <ButtonDemo />
        <AccordionDemo />
      </div>
    </div>
  );
}
