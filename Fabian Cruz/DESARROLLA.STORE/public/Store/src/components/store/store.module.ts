import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { Routes, RouterModule } from '@angular/router';

// Se importa el componente
// Es importante asignar el nombre igual al que exportamos en el archivo component.ts
import { StoreComponent } from './store';
import { HeaderComponent } from '../menuheader/menuHeader';
import { FooterComponent } from '../footer-menu/footer-menu';
import { CardsComponent } from '../cards/cards';
import { InicioComponent } from '../inicio/inicio';
import { LoginComponent } from '../login/login';
import { RegisterComponent } from '../register/register';
import { CartComponent } from '../cart/cart';

const routes: Routes = [
  { path: 'catalog', component: CardsComponent},
  { path: '', component: InicioComponent},
  { path: 'login', component: LoginComponent},
  { path: 'register', component: RegisterComponent},
  { path: 'cart', component: CartComponent}
];

@NgModule({
  declarations: [
    StoreComponent, // Se añae el componente importado arriba
    HeaderComponent,
    FooterComponent,
    CardsComponent,
    InicioComponent,
    LoginComponent,
    RegisterComponent,
    CartComponent
  ],
  imports: [
    BrowserModule,
    RouterModule.forRoot(routes)
    // AppRoutingModule
  ],
  providers: [],
  bootstrap: [StoreComponent] //Si se le desea añadir bootstrap a este componente
})


export class StoreModule { } // Exportar este modulo con el mismo nombre de nuestro componente
// Ejemplo: Si mi componente es catalogo.component.ts, entonces debo exportar CatalogoModule