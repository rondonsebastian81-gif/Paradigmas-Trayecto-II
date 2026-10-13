/* ==========================================================================
   Café Control - JavaScript general
   ========================================================================== */
(function () {
    'use strict';

    /* -------- Menú lateral (responsive) -------- */
    const btnMenu = document.getElementById('btnMenu');
    const sidebar = document.getElementById('sidebar');
    if (btnMenu && sidebar) {
        btnMenu.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    /* -------- Modales -------- */
    window.abrirModal = function (id) {
        const m = document.getElementById(id);
        if (m) m.classList.add('open');
    };
    window.cerrarModal = function (id) {
        const m = document.getElementById(id);
        if (m) m.classList.remove('open');
    };
    document.querySelectorAll('.modal-backdrop').forEach((bd) => {
        bd.addEventListener('click', (ev) => {
            if (ev.target === bd) bd.classList.remove('open');
        });
    });

    /* -------- Formato de números -------- */
    const fmtBs  = (n) => 'Bs ' + (Number(n) || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtUsd = (n) => '$ ' + (Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    window.fmtBs = fmtBs;
    window.fmtUsd = fmtUsd;

    /* -------- Validación de datos -------- */
    const regex = {
        rif:     /^[VEJPGvejpg]-?\d{7,9}-?\d?$/,
        cedula:  /^\d{1,2}\.?\d{3}\.?\d{3}$/,
        telefono:/^[0-9+\-\s()]+$/,
        email:   /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        numero:  /^-?\d+(\.\d+)?$/,
        positivo:/^\d+(\.\d+)?$/
    };

    function validarCampo(input) {
        const val = (input.value || '').trim();
        const tipo = input.dataset.validate;
        const field = input.closest('.field');
        let ok = true;

        if (input.required && val === '') ok = false;

        if (ok && val !== '' && tipo) {
            if (tipo === 'rif')     ok = regex.rif.test(val);
            if (tipo === 'cedula')  ok = regex.cedula.test(val);
            if (tipo === 'telefono')ok = regex.telefono.test(val) && val.replace(/\D/g, '').length >= 7;
            if (tipo === 'email')   ok = regex.email.test(val);
            if (tipo === 'numero')  ok = regex.numero.test(val);
            if (tipo === 'positivo')ok = regex.positivo.test(val) && Number(val) >= 0;
        }

        // Reglas de rango
        if (ok && val !== '' && input.dataset.min !== undefined && Number(val) < Number(input.dataset.min)) ok = false;
        if (ok && val !== '' && input.dataset.max !== undefined && Number(val) > Number(input.dataset.max)) ok = false;

        if (field) field.classList.toggle('invalid', !ok);
        return ok;
    }

    window.validarFormulario = function (form) {
        let valido = true;
        form.querySelectorAll('input, select, textarea').forEach((el) => {
            if (el.disabled) return;
            if (!validarCampo(el)) valido = false;
        });
        return valido;
    };

    document.addEventListener('input', (ev) => {
        const el = ev.target;
        if (el.matches('input, select, textarea') && el.dataset.validate) validarCampo(el);
    });
    document.addEventListener('blur', (ev) => {
        const el = ev.target;
        if (el.matches('input, select, textarea') && el.dataset.validate) validarCampo(el);
    }, true);

    // Intercepta submit de formularios marcados con data-validar
    document.addEventListener('submit', (ev) => {
        const form = ev.target;
        if (form.dataset && form.dataset.validar !== undefined) {
            if (!window.validarFormulario(form)) {
                ev.preventDefault();
                const primero = form.querySelector('.field.invalid input, .field.invalid select, .field.invalid textarea');
                if (primero) primero.focus();
            }
        }
    });

    /* -------- Confirmaciones -------- */
    document.addEventListener('click', (ev) => {
        const el = ev.target.closest('[data-confirm]');
        if (el && !confirm(el.dataset.confirm)) ev.preventDefault();
    });
})();
