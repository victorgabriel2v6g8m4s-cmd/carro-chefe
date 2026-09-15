Attribute VB_Name = "CAutocompleteFicha"
Attribute VB_Base = "0{FCFB3D2A-A0FA-1068-A738-08002B3371B5}"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Attribute VB_TemplateDerived = False
Attribute VB_Customizable = False
Option Explicit


'==========================================================
' CONTROLES
'==========================================================

Private WithEvents mEditor As MSForms.TextBox
Attribute mEditor.VB_VarHelpID = -1
Private WithEvents mBotao As MSForms.CommandButton
Attribute mBotao.VB_VarHelpID = -1
Private WithEvents mLista As MSForms.ListBox
Attribute mLista.VB_VarHelpID = -1

Private mOLEEditor As OLEObject
Private mOLEBotao As OLEObject
Private mOLELista As OLEObject


'==========================================================
' ESTADO
'==========================================================

Private mCelula As Range
Private mDados As Variant

Private mValorOriginal As String
Private mTermoBusca As String

Private mAtualizando As Boolean
Private mSessaoAtiva As Boolean
Private mPainelAberto As Boolean


'==========================================================
' INICIALIZA
'==========================================================

Public Sub Inicializar( _
    ByVal oleEditor As OLEObject, _
    ByVal oleBotao As OLEObject, _
    ByVal oleLista As OLEObject, _
    ByVal celula As Range)

    Debug.Print _
        "[INIT] " & _
        celula.Parent.Name & _
        "!" & _
        celula.Address(False, False)


    Set mOLEEditor = oleEditor
    Set mOLEBotao = oleBotao
    Set mOLELista = oleLista

    Set mEditor = oleEditor.Object
    Set mBotao = oleBotao.Object
    Set mLista = oleLista.Object

    Set mCelula = celula


    mSessaoAtiva = True
    mPainelAberto = False
    mAtualizando = True

    mValorOriginal = CStr(celula.Value)
    mTermoBusca = ""


    '======================================================
    ' DADOS
    '======================================================

    mDados = ObterItensFichaOrdenados()

    ConfigurarControles

    PreencherResultados ""


    mEditor.Value = mValorOriginal


    'Seleciona todo o texto existente.
    '
    'Assim, começar a digitar substitui
    'o conteúdo anterior.
    mEditor.SelStart = 0
    mEditor.SelLength = Len(mEditor.Text)


    mAtualizando = False


    OcultarPainel


    AtivarEditorSeguro

End Sub


'==========================================================
' MESMA CÉLULA?
'==========================================================

Public Function EstaNaMesmaCelula( _
    ByVal ws As Worksheet, _
    ByVal alvo As Range) As Boolean

    On Error GoTo Nao


    If Not mSessaoAtiva Then GoTo Nao

    If mCelula Is Nothing Then GoTo Nao

    If alvo Is Nothing Then GoTo Nao

    If alvo.CountLarge <> 1 Then GoTo Nao


    If Not (mCelula.Worksheet Is ws) Then _
        GoTo Nao


    EstaNaMesmaCelula = _
        (mCelula.Address = alvo.Address)


    Exit Function


Nao:

    EstaNaMesmaCelula = False

End Function


'==========================================================
' ATIVA O EDITOR
'==========================================================

Private Sub AtivarEditorSeguro()

    Dim eventosAnteriores As Boolean


    On Error GoTo Finalizar


    eventosAnteriores = _
        Application.EnableEvents


    Application.EnableEvents = False


    mOLEEditor.Activate


    DoEvents


Finalizar:

    Application.EnableEvents = _
        eventosAnteriores

End Sub


'==========================================================
' CONFIGURA CONTROLES
'==========================================================

Private Sub ConfigurarControles()


    '======================================================
    ' TEXTBOX
    '======================================================

    With mEditor

        .Font.Size = 11

        .BorderStyle = _
            fmBorderStyleSingle

        .SpecialEffect = _
            fmSpecialEffectFlat

        .EnterKeyBehavior = False

        .Multiline = False

        .TabKeyBehavior = False

    End With


    '======================================================
    ' BOTÃO
    '======================================================

    With mBotao

        .Caption = "?"

        .Font.Size = 8

        .TakeFocusOnClick = False

        'Não usar SpecialEffect:
        'gera erro 438 nesta instalação.

    End With


    '======================================================
    ' LISTBOX
    '======================================================

    With mLista

        .Font.Size = 11

        .BorderStyle = _
            fmBorderStyleSingle

        .SpecialEffect = _
            fmSpecialEffectFlat

        .MultiSelect = _
            fmMultiSelectSingle

        .IntegralHeight = False

    End With

End Sub


'==========================================================
' DIGITAÇÃO
'==========================================================

Private Sub mEditor_Change()

    Dim texto As String


    If mAtualizando Then Exit Sub

    If Not mSessaoAtiva Then Exit Sub


    texto = mEditor.Text

    mTermoBusca = texto


    Debug.Print _
        "[BUSCA] """ & texto & """"


    PreencherResultados texto


    '======================================================
    ' DIGITOU = ABRE RESULTADOS
    '======================================================

    If mLista.ListCount > 0 Then

        MostrarPainel

    Else

        OcultarPainel

    End If

End Sub


'==========================================================
' BOTÃO ?
'==========================================================

Private Sub mBotao_Click()

    If Not mSessaoAtiva Then Exit Sub


    If mPainelAberto Then

        OcultarPainel

        AtivarEditorSeguro

        Exit Sub

    End If


    If Len(Trim$(mTermoBusca)) > 0 Then

        PreencherResultados _
            mTermoBusca

    Else

        PreencherResultados ""

    End If


    MostrarPainel


    SelecionarValorNaLista _
        CStr(mCelula.Value)


    AtivarEditorSeguro

End Sub


'==========================================================
' TECLADO DO EDITOR
'==========================================================

Private Sub mEditor_KeyDown( _
    ByVal KeyCode As MSForms.ReturnInteger, _
    ByVal Shift As Integer)

    Const TECLA_SHIFT As Integer = 1
    Const TECLA_CTRL As Integer = 2


    If Not mSessaoAtiva Then Exit Sub


    Select Case KeyCode


        '==================================================
        ' ?
        '==================================================

        Case vbKeyUp


            'Lista aberta:
            'navega nas sugestões.
            If mPainelAberto Then

                NavegarLista -1


            'Lista fechada:
            'navega pelas células.
            Else

                ConfirmarResultadoAtual

                EncerrarSessao -1, 0

            End If


            KeyCode = 0


        '==================================================
        ' ?
        '==================================================

        Case vbKeyDown


            If mPainelAberto Then

                NavegarLista 1

            Else

                ConfirmarResultadoAtual

                EncerrarSessao 1, 0

            End If


            KeyCode = 0


        '==================================================
        ' ?
        '==================================================

        Case vbKeyLeft


            ConfirmarResultadoAtual

            EncerrarSessao 0, -1


            KeyCode = 0


        '==================================================
        ' ?
        '==================================================

        Case vbKeyRight


            ConfirmarResultadoAtual

            EncerrarSessao 0, 1


            KeyCode = 0


        '==================================================
        ' ENTER
        '==================================================

        Case vbKeyReturn


            ConfirmarResultadoAtual


            'CTRL + ENTER
            If (Shift And TECLA_CTRL) <> 0 Then

                EncerrarSessao 0, 0


            'SHIFT + ENTER
            ElseIf _
                (Shift And TECLA_SHIFT) <> 0 Then

                EncerrarSessao -1, 0


            'ENTER
            Else

                EncerrarSessao 1, 0

            End If


            KeyCode = 0


        '==================================================
        ' TAB
        '==================================================

        Case vbKeyTab


            ConfirmarResultadoAtual


            'SHIFT + TAB
            If _
                (Shift And TECLA_SHIFT) <> 0 Then

                EncerrarSessao 0, -1

            Else

                EncerrarSessao 0, 1

            End If


            KeyCode = 0


        '==================================================
        ' ESC
        '
        'Regra:
        '
        '1. mantém EXATAMENTE o conteúdo atual do editor;
        '2. aceita inclusive texto vazio;
        '3. fecha ListBox;
        '4. fecha editor;
        '5. fecha botão;
        '6. permanece na célula atual.
        '==================================================

        Case vbKeyEscape


            SalvarValorAtualDoEditor


            EncerrarSessao 0, 0


            KeyCode = 0

    End Select

End Sub


'==========================================================
' CLIQUE NA LISTA
'==========================================================

Private Sub mLista_Click()

    Dim valor As String


    If mAtualizando Then Exit Sub

    If Not mSessaoAtiva Then Exit Sub

    If mLista.ListIndex < 0 Then Exit Sub


    valor = _
        CStr( _
            mLista.List( _
                mLista.ListIndex))


    AtualizarEditorComSelecao valor


    GravarNaCelula valor


    EncerrarSessao 0, 0

End Sub


'==========================================================
' TECLADO DA LISTBOX
'==========================================================

Private Sub mLista_KeyDown( _
    ByVal KeyCode As MSForms.ReturnInteger, _
    ByVal Shift As Integer)

    Const TECLA_SHIFT As Integer = 1
    Const TECLA_CTRL As Integer = 2


    Select Case KeyCode


        '==================================================
        ' ? / ?
        '
        'Deixamos a própria ListBox navegar.
        '==================================================

        Case vbKeyUp, vbKeyDown

            'Nada.


        '==================================================
        ' ?
        '==================================================

        Case vbKeyLeft


            ConfirmarResultadoAtual

            EncerrarSessao 0, -1


            KeyCode = 0


        '==================================================
        ' ?
        '==================================================

        Case vbKeyRight


            ConfirmarResultadoAtual

            EncerrarSessao 0, 1


            KeyCode = 0


        '==================================================
        ' ENTER
        '==================================================

        Case vbKeyReturn


            ConfirmarResultadoAtual


            If (Shift And TECLA_CTRL) <> 0 Then

                EncerrarSessao 0, 0


            ElseIf _
                (Shift And TECLA_SHIFT) <> 0 Then

                EncerrarSessao -1, 0


            Else

                EncerrarSessao 1, 0

            End If


            KeyCode = 0


        '==================================================
        ' TAB
        '==================================================

        Case vbKeyTab


            ConfirmarResultadoAtual


            If _
                (Shift And TECLA_SHIFT) <> 0 Then

                EncerrarSessao 0, -1

            Else

                EncerrarSessao 0, 1

            End If


            KeyCode = 0


        '==================================================
        ' ESC
        '
        'Mesmo comportamento do editor:
        'salva exatamente o texto visível
        'e fecha a sessão inteira.
        '==================================================

        Case vbKeyEscape


            SalvarValorAtualDoEditor


            EncerrarSessao 0, 0


            KeyCode = 0

    End Select

End Sub


'==========================================================
' SALVA EXATAMENTE O CONTEÚDO ATUAL DO EDITOR
'
' IMPORTANTE:
'
' Não valida.
' Não procura sugestão.
' Não restaura valor anterior.
' Não ignora vazio.
'
' Exemplos:
'
' ""              -> célula vazia
' "massa"         -> "massa"
' "Massa Pastel"  -> "Massa Pastel"
'==========================================================

Private Sub SalvarValorAtualDoEditor()

    Dim valorAtual As String


    valorAtual = _
        CStr(mEditor.Text)


    Debug.Print _
        "[ESC] Salvando valor atual: """ & _
        valorAtual & _
        """"


    GravarNaCelula _
        valorAtual

End Sub


'==========================================================
' NAVEGA NAS SUGESTÕES
'==========================================================

Private Sub NavegarLista( _
    ByVal direcao As Long)

    Dim novoIndice As Long


    If mLista.ListCount = 0 Then Exit Sub


    '======================================================
    ' NENHUM SELECIONADO
    '======================================================

    If mLista.ListIndex < 0 Then


        If direcao > 0 Then

            novoIndice = 0

        Else

            novoIndice = _
                mLista.ListCount - 1

        End If


    '======================================================
    ' JÁ EXISTE SELEÇÃO
    '======================================================

    Else


        novoIndice = _
            mLista.ListIndex + direcao


        If novoIndice < 0 Then

            novoIndice = 0


        ElseIf _
            novoIndice > _
            mLista.ListCount - 1 Then


            novoIndice = _
                mLista.ListCount - 1

        End If

    End If


    mAtualizando = True


    mLista.ListIndex = _
        novoIndice


    AtualizarEditorComSelecao _
        CStr( _
            mLista.List( _
                novoIndice))


    mAtualizando = False

End Sub


'==========================================================
' ATUALIZA O EDITOR COM A SUGESTÃO DESTACADA
'==========================================================

Private Sub AtualizarEditorComSelecao( _
    ByVal valor As String)

    Dim estadoAnterior As Boolean


    estadoAnterior = _
        mAtualizando


    mAtualizando = True


    mEditor.Value = valor


    mEditor.SelStart = _
        Len(valor)

    mEditor.SelLength = 0


    mAtualizando = _
        estadoAnterior

End Sub


'==========================================================
' FILTRA RESULTADOS
'==========================================================

Private Sub PreencherResultados( _
    ByVal pesquisa As String)

    Dim i As Long


    mAtualizando = True


    mLista.Clear


    If IsArray(mDados) Then


        On Error GoTo Finalizar


        For i = _
            LBound(mDados) _
            To UBound(mDados)


            If ItemCorresponde( _
                CStr(mDados(i)), _
                pesquisa) Then


                mLista.AddItem _
                    CStr(mDados(i))

            End If

        Next i

    End If


Finalizar:


    mLista.ListIndex = -1


    mAtualizando = False


    AtualizarTamanhoPainel

End Sub


'==========================================================
' TAMANHO DO PAINEL
'==========================================================

Private Sub AtualizarTamanhoPainel()

    Const MAX_ITENS_VISIVEIS As Long = 8

    Const ALTURA_ITEM As Double = 18

    Const MARGEM As Double = 4


    Dim quantidadeVisivel As Long


    If mLista.ListCount <= 0 Then

        mOLELista.Height = _
            ALTURA_ITEM + MARGEM

        Exit Sub

    End If


    quantidadeVisivel = _
        mLista.ListCount


    If quantidadeVisivel > _
        MAX_ITENS_VISIVEIS Then

        quantidadeVisivel = _
            MAX_ITENS_VISIVEIS

    End If


    mOLELista.Height = _
        (quantidadeVisivel * ALTURA_ITEM) + _
        MARGEM

End Sub


'==========================================================
' MOSTRA PAINEL
'==========================================================

Private Sub MostrarPainel()


    If mLista.ListCount <= 0 Then

        OcultarPainel

        Exit Sub

    End If


    AtualizarTamanhoPainel


    PosicionarPainel


    mOLELista.Visible = True


    On Error Resume Next


    mOLELista.ShapeRange.ZOrder _
        msoBringToFront


    On Error GoTo 0


    mPainelAberto = True

End Sub


'==========================================================
' OCULTA PAINEL
'==========================================================

Private Sub OcultarPainel()


    On Error Resume Next


    mOLELista.Visible = False


    On Error GoTo 0


    mPainelAberto = False

End Sub


'==========================================================
' POSICIONA PAINEL
'==========================================================

Private Sub PosicionarPainel()

    Dim limiteInferior As Double

    Dim topoAbaixo As Double
    Dim topoAcima As Double

    Dim visivel As Range
    Dim ultimaCelula As Range


    On Error GoTo Abaixo


    Set visivel = _
        ActiveWindow.VisibleRange


    Set ultimaCelula = _
        visivel.Cells( _
            visivel.Rows.Count, _
            1)


    limiteInferior = _
        ultimaCelula.Top + _
        ultimaCelula.Height


    topoAbaixo = _
        mCelula.Top + _
        mCelula.Height


    topoAcima = _
        mCelula.Top - _
        mOLELista.Height


    If _
        topoAbaixo + _
        mOLELista.Height <= _
        limiteInferior Then


        mOLELista.Top = _
            topoAbaixo


    ElseIf topoAcima >= 0 Then


        mOLELista.Top = _
            topoAcima


    Else


        mOLELista.Top = _
            topoAbaixo

    End If


    mOLELista.Left = _
        mCelula.Left


    mOLELista.Width = _
        mCelula.Width


    Exit Sub


Abaixo:


    mOLELista.Left = _
        mCelula.Left


    mOLELista.Top = _
        mCelula.Top + _
        mCelula.Height


    mOLELista.Width = _
        mCelula.Width

End Sub


'==========================================================
' CONFIRMA RESULTADO
'
' Usado por Enter, Tab e setas de navegação.
'
' ESC NÃO usa essa função.
'==========================================================

Private Sub ConfirmarResultadoAtual()

    Dim valor As String
    Dim i As Long


    '======================================================
    ' RESULTADO DESTACADO
    '======================================================

    If mLista.ListIndex >= 0 Then


        valor = _
            CStr( _
                mLista.List( _
                    mLista.ListIndex))


        AtualizarEditorComSelecao _
            valor


        GravarNaCelula _
            valor


        Exit Sub

    End If


    '======================================================
    ' TEXTO EXATAMENTE IGUAL
    '======================================================

    valor = _
        Trim$(mEditor.Text)


    If Len(valor) > 0 Then


        For i = _
            0 To _
            mLista.ListCount - 1


            If StrComp( _
                NormalizarTexto( _
                    CStr(mLista.List(i))), _
                NormalizarTexto(valor), _
                vbTextCompare) = 0 Then


                valor = _
                    CStr(mLista.List(i))


                AtualizarEditorComSelecao _
                    valor


                GravarNaCelula _
                    valor


                Exit Sub

            End If

        Next i

    End If


    '======================================================
    ' APENAS UMA POSSIBILIDADE
    '======================================================

    If mLista.ListCount = 1 Then


        valor = _
            CStr(mLista.List(0))


        AtualizarEditorComSelecao _
            valor


        GravarNaCelula _
            valor


        Exit Sub

    End If


    '======================================================
    ' BUSCA AMBÍGUA
    '
    'Para Enter/Tab/setas:
    'restaura o valor original.
    '
    'ESC é diferente e não passa por aqui.
    '======================================================

    GravarNaCelula _
        mValorOriginal

End Sub


'==========================================================
' GRAVA NA CÉLULA
'==========================================================

Private Sub GravarNaCelula( _
    ByVal valor As String)

    Dim eventosAnteriores As Boolean


    eventosAnteriores = _
        Application.EnableEvents


    On Error GoTo Finalizar


    Application.EnableEvents = False


    mCelula.Value = valor


Finalizar:


    Application.EnableEvents = _
        eventosAnteriores

End Sub


'==========================================================
' ENCERRA SESSÃO
'==========================================================

Private Sub EncerrarSessao( _
    Optional ByVal deslocLinha As Long = 0, _
    Optional ByVal deslocColuna As Long = 0)

    Dim destino As Range

    Dim eventosAnteriores As Boolean


    If Not mSessaoAtiva Then Exit Sub


    mSessaoAtiva = False

    mPainelAberto = False


    '======================================================
    ' DESTINO
    '======================================================

    On Error Resume Next


    Set destino = _
        mCelula.Offset( _
            deslocLinha, _
            deslocColuna)


    On Error GoTo 0


    '======================================================
    ' FECHA O AUTOCOMPLETE
    '======================================================

    OcultarControles


    If destino Is Nothing Then Exit Sub


    '======================================================
    ' SELECIONA A CÉLULA DE DESTINO
    '======================================================

    eventosAnteriores = _
        Application.EnableEvents


    On Error GoTo Finalizar


    Application.EnableEvents = False


    destino.Select


Finalizar:


    Application.EnableEvents = _
        eventosAnteriores


    '======================================================
    ' IMPORTANTE
    '
    'Só prepara uma nova sessão automaticamente se
    'realmente houve deslocamento.
    '
    'No ESC usamos:
    '
    'EncerrarSessao 0, 0
    '
    'Portanto NÃO recriamos imediatamente o controle
    'na mesma célula que acabamos de fechar.
    '======================================================

    If _
        deslocLinha = 0 And _
        deslocColuna = 0 Then

        Exit Sub

    End If


    On Error Resume Next


    If _
        StrComp( _
            destino.Worksheet.Name, _
            "ingredientes", _
            vbTextCompare) = 0 Then


        If EhCelulaFicha(destino) Then


            AtivarAutocomplete _
                destino.Worksheet, _
                destino

        End If

    End If


    On Error GoTo 0

End Sub


'==========================================================
' OCULTA TODOS OS CONTROLES
'==========================================================

Private Sub OcultarControles()


    On Error Resume Next


    mOLELista.Visible = False

    mOLEEditor.Visible = False

    mOLEBotao.Visible = False


    On Error GoTo 0

End Sub


'==========================================================
' SELECIONA O VALOR ATUAL NA LISTA
'==========================================================

Private Sub SelecionarValorNaLista( _
    ByVal valor As String)

    Dim i As Long


    If Len(Trim$(valor)) = 0 Then _
        Exit Sub


    For i = _
        0 To _
        mLista.ListCount - 1


        If StrComp( _
            NormalizarTexto( _
                CStr(mLista.List(i))), _
            NormalizarTexto(valor), _
            vbTextCompare) = 0 Then


            mAtualizando = True


            mLista.ListIndex = i


            mAtualizando = False


            Exit Sub

        End If

    Next i

End Sub

