import { Component } from '@angular/core';
import { DashboardComponent } from './dashboard/dashboard.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DashboardComponent],
  template: `<main class="shell"><app-dashboard /></main>`,
  styles: [
    `
      .shell {
        min-height: 100vh;
        padding: clamp(1rem, 3vw, 2.5rem);
        background:
          radial-gradient(1200px 600px at 10% -10%, rgba(47, 111, 237, 0.35), transparent 60%),
          radial-gradient(900px 500px at 100% 0%, rgba(45, 180, 160, 0.18), transparent 55%),
          #070b14;
      }
    `,
  ],
})
export class AppComponent {}
