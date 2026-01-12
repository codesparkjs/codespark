import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { Outlet } from 'react-router';

import { baseOptions } from '~/lib/layout.shared';

export default function WithNavLayout() {
  return (
    <HomeLayout {...baseOptions()}>
      <Outlet />
    </HomeLayout>
  );
}
