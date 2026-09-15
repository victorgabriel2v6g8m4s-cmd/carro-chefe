Attribute VB_Name = "modAutocompleteFicha"
Option Explicit


'==========================================================
' SESSÃO GLOBAL
'==========================================================

Public AutocompleteFicha As CAutocompleteFicha


'==========================================================
' TRAVA DE REENTRÂNCIA
'
' Fundamental:
'
' enquanto ativamos/focamos um ActiveX,
' ignoramos SelectionChange disparados pelo próprio Excel.
'==========================================================

Public AutocompleteInicializando As Boolean


'==========================================================
' NOMES
'==========================================================

Private Const NOME_EDITOR As String = _
    "txtAutocompleteFicha"

Private Const NOME_BOTAO As String = _
    "btnAutocompleteFicha"

Private Const NOME_LISTA As String = _
    "lstAutocompleteFicha"


Private Const LARGURA_BOTAO As Double = 17


'==========================================================
' ATIVA
'==========================================================

Public Sub AtivarAutocomplete( _
    ByVal ws As Worksheet, _
    ByVal alvo As Range)

    Dim editor As OLEObject
    Dim botao As OLEObject
    Dim lista As OLEObject

    Dim larguraEditor As Double


    'On Error GoTo ErroInicializacao
    On Error GoTo 0

    If alvo Is Nothing Then Exit Sub

    If alvo.CountLarge <> 1 Then Exit Sub


    Debug.Print _
        "AtivarAutocomplete | " & _
        ws.Name & _
        " | " & _
        alvo.Address(False, False)


    If Not EhCelulaFicha(alvo) Then

        Debug.Print _
            "Ignorado: célula não pertence à coluna Item."

        Exit Sub

    End If


    Debug.Print _
        "Célula válida para autocomplete."


    '======================================================
    ' TRAVA
    '======================================================

    AutocompleteInicializando = True


    '======================================================
    ' CONTROLES
    '======================================================

    Set editor = _
        ObterOuCriarEditor(ws)

    Debug.Print _
        "Editor OK: " & editor.Name


    Set botao = _
        ObterOuCriarBotao(ws)

    Debug.Print _
        "Botão OK: " & botao.Name


    Set lista = _
        ObterOuCriarLista(ws)

    Debug.Print _
        "Lista OK: " & lista.Name


    '======================================================
    ' TAMANHOS
    '======================================================

    larguraEditor = _
        alvo.Width - LARGURA_BOTAO


    If larguraEditor < 5 Then
        larguraEditor = 5
    End If


    With editor

        .Left = alvo.Left
        .Top = alvo.Top

        .Width = larguraEditor
        .Height = alvo.Height

        .Placement = xlMoveAndSize

        .Visible = True

    End With


    With botao

        .Left = _
            alvo.Left + larguraEditor

        .Top = alvo.Top

        .Width = _
            alvo.Width - larguraEditor

        .Height = alvo.Height

        .Placement = xlMoveAndSize

        .Visible = True

    End With


    With lista

        .Left = alvo.Left

        .Top = _
            alvo.Top + alvo.Height

        .Width = alvo.Width
        .Height = 20

        .Placement = xlMove

        .Visible = False

    End With


    TrazerParaFrente editor
    TrazerParaFrente botao


    '======================================================
    ' CONTROLADOR
    '======================================================

    Set AutocompleteFicha = _
        New CAutocompleteFicha


    Debug.Print _
        "Classe criada."


    AutocompleteFicha.Inicializar _
        editor, _
        botao, _
        lista, _
        alvo


    Debug.Print _
        "Autocomplete inicializado com sucesso."


Finalizar:

    AutocompleteInicializando = False

    Exit Sub


ErroInicializacao:

    Debug.Print _
    "Autocomplete inicializado com sucesso."

    AutocompleteInicializando = False
    
End Sub


'==========================================================
' CÉLULA DA FICHA
'==========================================================

Public Function EhCelulaFicha( _
    ByVal celula As Range) As Boolean

    Dim tabela As ListObject

    Dim indiceColuna As Long

    Dim nomeColuna As String
    Dim fonte As String


    On Error GoTo NaoEh


    Set tabela = celula.ListObject


    If tabela Is Nothing Then _
        GoTo NaoEh


    If tabela.DataBodyRange Is Nothing Then _
        GoTo NaoEh


    If Intersect( _
        celula, _
        tabela.DataBodyRange) Is Nothing Then

        GoTo NaoEh

    End If


    indiceColuna = _
        celula.Column - _
        tabela.Range.Column + 1


    If indiceColuna < 1 Then _
        GoTo NaoEh


    If indiceColuna > _
        tabela.ListColumns.Count Then

        GoTo NaoEh

    End If


    nomeColuna = _
        Trim$( _
            tabela.ListColumns( _
                indiceColuna).Name)


    '======================================================
    ' SOMENTE ITEM
    '======================================================

    If StrComp( _
        nomeColuna, _
        "Item", _
        vbTextCompare) <> 0 Then

        GoTo NaoEh

    End If


    '======================================================
    ' VALIDAÇÃO
    '======================================================

    If celula.Validation.Type <> _
        xlValidateList Then

        GoTo NaoEh

    End If


    fonte = _
        celula.Validation.Formula1


    If InStr( _
        1, _
        fonte, _
        "insumos", _
        vbTextCompare) = 0 Then

        GoTo NaoEh

    End If


    EhCelulaFicha = True

    Exit Function


NaoEh:

    EhCelulaFicha = False

End Function


'==========================================================
' BUSCA OLE POR NOME
'==========================================================

Private Function EncontrarOLEPorNome( _
    ByVal ws As Worksheet, _
    ByVal nomeObjeto As String) As OLEObject

    Dim objeto As OLEObject


    For Each objeto In ws.OLEObjects

        If StrComp( _
            objeto.Name, _
            nomeObjeto, _
            vbTextCompare) = 0 Then


            Set EncontrarOLEPorNome = objeto

            Exit Function

        End If

    Next objeto


    Set EncontrarOLEPorNome = Nothing

End Function


'==========================================================
' EDITOR
'==========================================================

Private Function ObterOuCriarEditor( _
    ByVal ws As Worksheet) As OLEObject

    Dim objeto As OLEObject


    Set objeto = _
        EncontrarOLEPorNome( _
            ws, _
            NOME_EDITOR)


    If objeto Is Nothing Then

        Debug.Print _
            "Criando TextBox..."


        Set objeto = _
            ws.OLEObjects.Add( _
                ClassType:="Forms.TextBox.1", _
                Link:=False, _
                DisplayAsIcon:=False, _
                Left:=10, _
                Top:=10, _
                Width:=100, _
                Height:=20)


        objeto.Name = NOME_EDITOR

    Else

        Debug.Print _
            "TextBox existente encontrado."

    End If


    Set ObterOuCriarEditor = objeto

End Function


'==========================================================
' BOTÃO
'==========================================================

Private Function ObterOuCriarBotao( _
    ByVal ws As Worksheet) As OLEObject

    Dim objeto As OLEObject


    Set objeto = _
        EncontrarOLEPorNome( _
            ws, _
            NOME_BOTAO)


    If objeto Is Nothing Then

        Debug.Print _
            "Criando botão..."


        Set objeto = _
            ws.OLEObjects.Add( _
                ClassType:="Forms.CommandButton.1", _
                Link:=False, _
                DisplayAsIcon:=False, _
                Left:=110, _
                Top:=10, _
                Width:=17, _
                Height:=20)


        objeto.Name = NOME_BOTAO

    Else

        Debug.Print _
            "Botão existente encontrado."

    End If


    Set ObterOuCriarBotao = objeto

End Function


'==========================================================
' LISTA
'==========================================================

Private Function ObterOuCriarLista( _
    ByVal ws As Worksheet) As OLEObject

    Dim objeto As OLEObject


    Set objeto = _
        EncontrarOLEPorNome( _
            ws, _
            NOME_LISTA)


    If objeto Is Nothing Then

        Debug.Print _
            "Criando ListBox..."


        Set objeto = _
            ws.OLEObjects.Add( _
                ClassType:="Forms.ListBox.1", _
                Link:=False, _
                DisplayAsIcon:=False, _
                Left:=10, _
                Top:=30, _
                Width:=127, _
                Height:=100)


        objeto.Name = NOME_LISTA

    Else

        Debug.Print _
            "ListBox existente encontrado."

    End If


    Set ObterOuCriarLista = objeto

End Function


'==========================================================
' DADOS
'==========================================================

Public Function ObterItensFichaOrdenados() As Variant

    Dim dict As Object

    Dim tabelaInsumos As ListObject
    Dim tabelaProdutos As ListObject

    Dim itens As Variant


    Set dict = _
        CreateObject( _
            "Scripting.Dictionary")


    dict.CompareMode = vbTextCompare


    Set tabelaInsumos = _
        LocalizarTabela("insumos")


    If Not tabelaInsumos Is Nothing Then

        AdicionarColuna _
            tabelaInsumos, _
            "item", _
            dict

    End If


    Set tabelaProdutos = _
        LocalizarTabela("CaProdutos")


    If Not tabelaProdutos Is Nothing Then

        AdicionarColuna _
            tabelaProdutos, _
            "Item", _
            dict

    End If


    Debug.Print _
        "Itens encontrados: " & _
        dict.Count


    If dict.Count = 0 Then

        ObterItensFichaOrdenados = _
            Array()

        Exit Function

    End If


    itens = dict.Keys


    If UBound(itens) > LBound(itens) Then

        QuickSortTexto _
            itens, _
            LBound(itens), _
            UBound(itens)

    End If


    ObterItensFichaOrdenados = itens

End Function


Private Sub AdicionarColuna( _
    ByVal tabela As ListObject, _
    ByVal nomeColuna As String, _
    ByVal dict As Object)

    Dim coluna As ListColumn
    Dim celula As Range

    Dim texto As String


    Set coluna = Nothing


    On Error Resume Next

    Set coluna = _
        tabela.ListColumns(nomeColuna)

    On Error GoTo 0


    If coluna Is Nothing Then _
        Exit Sub


    If coluna.DataBodyRange Is Nothing Then _
        Exit Sub


    For Each celula In _
        coluna.DataBodyRange.Cells


        texto = _
            Trim$(CStr(celula.Value))


        If Len(texto) > 0 Then

            If Not dict.Exists(texto) Then

                dict.Add _
                    texto, _
                    texto

            End If

        End If

    Next celula

End Sub


'==========================================================
' PESQUISA
'==========================================================

Public Function ItemCorresponde( _
    ByVal item As String, _
    ByVal pesquisa As String) As Boolean

    Dim itemNormalizado As String
    Dim buscaNormalizada As String

    Dim termos As Variant
    Dim termo As Variant


    itemNormalizado = _
        NormalizarTexto(item)


    buscaNormalizada = _
        NormalizarTexto(pesquisa)


    If Len(buscaNormalizada) = 0 Then

        ItemCorresponde = True

        Exit Function

    End If


    termos = _
        Split(buscaNormalizada, " ")


    For Each termo In termos

        If Len(CStr(termo)) > 0 Then

            If InStr( _
                1, _
                itemNormalizado, _
                CStr(termo), _
                vbTextCompare) = 0 Then


                ItemCorresponde = False

                Exit Function

            End If

        End If

    Next termo


    ItemCorresponde = True

End Function


'==========================================================
' NORMALIZAÇÃO
'==========================================================

Public Function NormalizarTexto( _
    ByVal texto As String) As String

    texto = _
        LCase$(Trim$(texto))


    texto = Replace(texto, "á", "a")
    texto = Replace(texto, "à", "a")
    texto = Replace(texto, "ã", "a")
    texto = Replace(texto, "â", "a")
    texto = Replace(texto, "ä", "a")

    texto = Replace(texto, "é", "e")
    texto = Replace(texto, "è", "e")
    texto = Replace(texto, "ê", "e")
    texto = Replace(texto, "ë", "e")

    texto = Replace(texto, "í", "i")
    texto = Replace(texto, "ì", "i")
    texto = Replace(texto, "î", "i")
    texto = Replace(texto, "ï", "i")

    texto = Replace(texto, "ó", "o")
    texto = Replace(texto, "ò", "o")
    texto = Replace(texto, "õ", "o")
    texto = Replace(texto, "ô", "o")
    texto = Replace(texto, "ö", "o")

    texto = Replace(texto, "ú", "u")
    texto = Replace(texto, "ù", "u")
    texto = Replace(texto, "û", "u")
    texto = Replace(texto, "ü", "u")

    texto = Replace(texto, "ç", "c")


    Do While InStr(texto, "  ") > 0

        texto = _
            Replace( _
                texto, _
                "  ", _
                " ")

    Loop


    NormalizarTexto = texto

End Function


'==========================================================
' ORDENAÇÃO
'==========================================================

Private Sub QuickSortTexto( _
    ByRef dados As Variant, _
    ByVal inicio As Long, _
    ByVal fim As Long)

    Dim esquerda As Long
    Dim direita As Long

    Dim pivo As String
    Dim temporario As Variant


    esquerda = inicio
    direita = fim


    pivo = _
        CStr( _
            dados( _
                (inicio + fim) \ 2))


    Do While esquerda <= direita


        Do While _
            CompararTextoAZ( _
                CStr(dados(esquerda)), _
                pivo) < 0


            esquerda = esquerda + 1

        Loop


        Do While _
            CompararTextoAZ( _
                CStr(dados(direita)), _
                pivo) > 0


            direita = direita - 1

        Loop


        If esquerda <= direita Then

            temporario = _
                dados(esquerda)

            dados(esquerda) = _
                dados(direita)

            dados(direita) = _
                temporario


            esquerda = esquerda + 1
            direita = direita - 1

        End If

    Loop


    If inicio < direita Then

        QuickSortTexto _
            dados, _
            inicio, _
            direita

    End If


    If esquerda < fim Then

        QuickSortTexto _
            dados, _
            esquerda, _
            fim

    End If

End Sub


Private Function CompararTextoAZ( _
    ByVal texto1 As String, _
    ByVal texto2 As String) As Long

    CompararTextoAZ = _
        StrComp( _
            NormalizarTexto(texto1), _
            NormalizarTexto(texto2), _
            vbTextCompare)


    If CompararTextoAZ = 0 Then

        CompararTextoAZ = _
            StrComp( _
                texto1, _
                texto2, _
                vbTextCompare)

    End If

End Function


'==========================================================
' LOCALIZA TABELA
'==========================================================

Private Function LocalizarTabela( _
    ByVal nomeTabela As String) As ListObject

    Dim ws As Worksheet
    Dim tabela As ListObject


    For Each ws In _
        ThisWorkbook.Worksheets


        For Each tabela In _
            ws.ListObjects


            If StrComp( _
                tabela.Name, _
                nomeTabela, _
                vbTextCompare) = 0 Then


                Set LocalizarTabela = tabela

                Exit Function

            End If

        Next tabela

    Next ws


    Set LocalizarTabela = Nothing

End Function


'==========================================================
' OCULTA
'==========================================================

Public Sub OcultarAutocomplete()

    Dim ws As Worksheet
    Dim objeto As OLEObject


    For Each ws In _
        ThisWorkbook.Worksheets


        For Each objeto In _
            ws.OLEObjects


            If _
                StrComp( _
                    objeto.Name, _
                    NOME_EDITOR, _
                    vbTextCompare) = 0 _
            Or _
                StrComp( _
                    objeto.Name, _
                    NOME_BOTAO, _
                    vbTextCompare) = 0 _
            Or _
                StrComp( _
                    objeto.Name, _
                    NOME_LISTA, _
                    vbTextCompare) = 0 Then


                objeto.Visible = False

            End If

        Next objeto

    Next ws

End Sub


'==========================================================
' FRENTE
'==========================================================

Private Sub TrazerParaFrente( _
    ByVal objeto As OLEObject)

    On Error Resume Next

    objeto.ShapeRange.ZOrder _
        msoBringToFront

    On Error GoTo 0

End Sub

